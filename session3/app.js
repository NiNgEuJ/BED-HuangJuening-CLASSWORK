const express=require('express');
const app=express();
const sql=require('mssql');
const dbConfig=require('./dbConfig');
app.use(express.json());

app.listen(3000,() => {
    console.log('Listening on port 3000');
});

//GET all books
app.get('/books', async (req, res) => {
  const { title } = req.query;
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    let query = 'SELECT ISBN, Title, YearPublish, PublisherID, BookCat FROM Book';
    if (title) {
      query += " WHERE Title LIKE '%' + @title + '%'";
      request.input('title', sql.VarChar(200), title);
    }
    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (connection) await connection.close();
  }
});
/*(Lab 6)
app.get('/books',async(req,res) => {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const result=await connection.request().query(
            'SELECT ISBN,Title,YearPublish,PublisherID,BookCat FROM Book'
        );
        res.status(200).json(result.recordset);
    } catch(err) {
        console.error(err);
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});
*/

//GET one book by ISBN
app.get('/books/:isbn',async(req,res) => {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('isbn',sql.Char(10),req.params.isbn);
        const result=await request.query('SELECT ISBN,Title,YearPublish,PublisherID,BookCat FROM Book WHERE ISBN=@isbn');
        if (result.recordset.length===0) {
            return res.status(404).json({error:'Not found'});
        }
        res.status(200).json(result.recordset[0]);
    } catch(err) {
      console.error(err);
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

//POST a new book and its author, in one transaction
app.post('/books',async(req,res) => {
    const {isbn,title,yearPublish,publisherId,bookCat,authorId}=req.body;
    let connection;
    let transaction;
    try {
        connection=await sql.connect(dbConfig);
        transaction=new sql.Transaction(connection);
        await transaction.begin();

        const bookRequest=transaction.request();
        bookRequest.input('isbn',sql.Char(10),isbn);
        bookRequest.input('title',sql.VarChar(200),title);
        bookRequest.input('yearPublish',sql.Char(4),yearPublish);
        bookRequest.input('publisherId',sql.SmallInt,publisherId);
        bookRequest.input('bookCat',sql.Char(2),bookCat);
        const bookResult=await bookRequest.query(
            'INSERT INTO Book(ISBN,Title,YearPublish,PublisherID,BookCat)'+
            'OUTPUT INSERTED.*VALUES(@isbn,@title,@yearPublish,@publisherId,@bookCat)'
        );

        const authorRequest=transaction.request();
        authorRequest.input('isbn',sql.Char(10),isbn);
        authorRequest.input('authorId',sql.SmallInt,authorId);
        await authorRequest.query('INSERT INTO BookAuthor(ISBN,AuthorID) VALUES(@isbn,@authorId)'
        );

        await transaction.commit();
        res.status(201).json(bookResult.recordset[0]);
    } catch(err) {
        console.error(err);
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error(rollbackErr);
            }
        }
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

//GET one copy of a book
app.get('/books/:isbn/copies/:copyNo',async(req,res) => {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('isbn',sql.Char(10),req.params.isbn);
        request.input('copyNo',sql.TinyInt,req.params.copyNo);
        const result=await request.query(
            'SELECT ISBN,CopyNo,RentalRate,Status FROM BookCopy WHERE ISBN=@isbn AND CopyNo=@copyNo'
        );
        if (result.recordset.length===0) {
            return res.status(404).json({error:'Not found'});
        }
        res.status(200).json(result.recordset[0]);
    } catch(err) {
        console.error(err);
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

//PUT: change one copy's rental rate
app.put('/books/:isbn/copies/:copyNo',async(req,res) => {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('isbn',sql.Char(10),req.params.isbn);
        request.input('copyNo',sql.TinyInt,req.params.copyNo);
        request.input('rentalRate',sql.SmallMoney,req.body.rentalRate);
        const result=await request.query('UPDATE BookCopy SET RentalRate=@rentalRate OUTPUT INSERTED.*WHERE ISBN=@isbn AND CopyNo=@copyNo'
        );
        if (result.rowsAffected[0]===0) {
            return res.status(404).json({error:'Not found'});
        }
        res.status(200).json(result.recordset[0]);
    } catch(err) {
        console.error(err);
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

//DELETE one copy of a book
app.delete('/books/:isbn/copies/:copyNo',async(req,res) => {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('isbn',sql.Char(10),req.params.isbn);
        request.input('copyNo',sql.TinyInt,req.params.copyNo);
        const result=await request.query('DELETE FROM BookCopy WHERE ISBN=@isbn AND CopyNo=@copyNo');
        if (result.rowsAffected[0]===0) {
            return res.status(404).json({error:'Not found'});
        }
        res.status(204).send();
    } catch(err) {
        console.error(err);
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

//Check helper: checkAvailable looks the copy up. It gives back null if there is no such copy, true if it is free (Status 'D') and false if it is taken.
async function checkAvailable(isbn,copyNo) {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const result=await connection.request()
        .input('isbn',sql.Char(10),isbn)
        .input('copyNo',sql.TinyInt,copyNo)
        .query('SELECT Status FROM BookCopy WHERE ISBN=@isbn AND CopyNo=@copyNo');
        if (result.recordset[0]===0) return null;
        return result.recordset[0].Status==='D';
    } finally {
        if (connection) await connection.close();
    }
}

//Write helper: markRented sets the copy's Status to 'M'.
async function markRented(isbn,copyNo) {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        await connection.request()
        .input('isbn',sql.Char(10),isbn)
        .input('copyNo',sql.TinyInt,copyNo)
        .query("UPDATE BookCopy SET Status='M' WHERE ISBN=@isbn AND CopyNo=@copyNo");
    } finally {
        if (connection) await connection.close();
    }
}

//Return helper: markReturned sets the copy's Status to 'D'.
async function markReturned(isbn,copyNo) {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        await connection.request()
        .input('isbn',sql.Char(10),isbn)
        .input('copyNo',sql.TinyInt,copyNo)
        .query("UPDATE BookCopy SET Status='D' WHERE ISBN=@isbn AND CopyNo=@copyNo");
    } finally {
        if (connection) await connection.close();
    }
}

//Rent route: the route calls the check, reads its answer, and only then calls the write.
app.put('/books/:isbn/copies/:copyNo/rent',async(req,res) => {
    const {error,value}=copySchema.validate(req.params);
    if (error) return res.status(400).json({error:error.details[0].message});
    const isbn=value.isbn;
    const copyNo=value.copyNo;
    //(Lab8) const isbn=req.params.isbn;
    //(Lab8) const copyNo=parseInt(req.params.copyNo);
    try {
        const available=await checkAvailable(isbn,copyNo);
        if (available===null) return res.status(404).json({error:'Not found'});
        if (available===false) return res.status(409).json({error:'Copy is already rented'});
        await markRented(isbn,copyNo);
        res.status(200).json({ISBN:isbn,copyNo:copyNo,Status:'M'});
    } catch(err) {
        console.error(err);
        res.status(500).json({error:'Server error'});
    }
});

//Joi checks the shape of the request(400). A lookup checks the row is real(404).
const Joi=require('joi');

const copySchema=Joi.object({
    isbn:Joi.string().length(10).required(),
    copyNo:Joi.number().integer().min(1).required()
});

//Return route
app.put('/books/:isbn/copies/:copyNo/return',async(req,res) => {
    const {error,value}=copySchema.validate(req.params);
    if (error) return res.status(400).json({error:error.details[0].message});
    try {
        const available=await checkAvailable(value.isbn,value.copyNo);
        if (available===null) return res.status(404).json({error:'Not found'});
        if (available===true) return res.status(409).json({error:'Copy is not rented'});
        await markReturned(value.isbn,value.copyNo);
        res.status(200).json({ISBN:value.isbn,copyNo:value.copyNo,Status:'D'});
    } catch(err) {
        console.error(err);
        res.status(500).json({error:'Server error'});
    }
});