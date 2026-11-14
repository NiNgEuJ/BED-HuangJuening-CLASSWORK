const express=require('express');
const app=express();
const sql=require('mssql');

app.listen(3000,() => {
    console.log('Listening on port 3000');
});

//temporary route
app.post('/echo/:id',(req,res) => {
    console.log('params: ',req.params);
    console.log('query: ',req.query);
    console.log('body: ',req.body);
    res.status(200).json({ok:true});
});

//POST /echo/3?limit=2 body:{"name":"Test"}
//params:{id:'3'}
//query:{limit:'2'}
//body:{name:'Test'}

//express.json() commented out:
//body:undefined