const express=require('express');
const app=express();
const sql=require('mssql');
app.use(express.json());

const dbConfig={
    server:'localhost',
    database:'NPBookstore',
    user:'npbookstore_user',
    password:'MuimuI3073L6',
    options: {
        trustServerCertificate:true
    }
};

app.listen(3000,() => {
    console.log('Listening on port 3000');
});

//GET /publishers
app.get('/publishers',async(req,res) => {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const result=await connection.request().query('SELECT*FROM Publisher');
        res.status(200).json(result.recordset);
    } catch(err) {
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

//GET /publishers/:id
app.get('/publishers/:id',async(req,res) => {
    const publisherId=parseInt(req.params.id);
    if (isNaN(publisherId)) {
        return res.status(400).json({error:'Invalid id'});
    }
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('id',publisherId);
        const result=await request.query('SELECT*FROM Publisher WHERE PublisherID=@id');
        if (result.recordset.length===0) {
            return res.status(404).json({error:'Not found'});
        }
        res.status(200).json(result.recordset[0]);
    } catch(err) {
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

//POST /publishers
app.post('/publishers',async(req,res) => {
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('id',req.body.id);
        request.input('name',req.body.name);
        const sqlQuery=`INSERT INTO Publisher (PublisherID,Name) OUTPUT INSERTED.*VALUES(@id,@name)`;
        const result=await request.query(sqlQuery);
        res.status(201).json(result.recordset[0]);
    } catch(err) {
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

//PUT /publishers/:id
app.put('/publishers/:id',async(req,res) => {
    const publisherId=parseInt(req.params.id);
    if (isNaN(publisherId)) {
        return res.status(400).json({error:'Invalid id'});
    }
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('id',publisherId);
        request.input('name',req.body.name);
        const sqlQuery=`UPDATE Publisher SET Name=@name OUTPUT INSERTED.*WHERE PublisherID=@id`;
        const result=await request.query(sqlQuery);
        if (result.recordset.length===0) {
            return res.status(404).json({error:'Not found'});
        }
        res.status(200).json(result.recordset[0]);
    } catch(err) {
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});

// DELETE /publishers/:id
app.delete('/publishers/:id',async(req,res) => {
    const publisherId=parseInt(req.params.id);
    if (isNaN(publisherId)) {
        return res.status(400).json({error:'Invalid id'});
    }
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('id',publisherId);
        const sqlQuery=`DELETE FROM Publisher WHERE PublisherID=@id`;
        const result=await request.query(sqlQuery);
        if (result.rowsAffected[0]===0) {
            return res.status(404).json({error:'Not found'});
        }
        res.status(204).send();
    } catch(err) {
        res.status(500).json({error:'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});