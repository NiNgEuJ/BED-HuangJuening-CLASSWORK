const express=require('express');
const app=express();
const sql=require('mssql');

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

// GET /authors/:id
app.get('/authors/:id',async(req,res) => {
    const authorId=parseInt(req.params.id);
    if (isNaN(authorId)) {
        return res.status(400).json({error: 'Invalid id'});
    }
    let connection;
    try {
        connection=await sql.connect(dbConfig);
        const request=connection.request();
        request.input('id',authorId);
        const sqlQuery='SELECT AuthorID,Name FROM Author WHERE AuthorID=@id';
        const result=await request.query(sqlQuery);
        if (result.recordset.length===0) {
            return res.status(404).json({error: 'Not found'});
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error("SQL ERROR:", err);
        res.status(500).json({error: 'Database error'});
    } finally {
        if (connection) await connection.close();
    }
});