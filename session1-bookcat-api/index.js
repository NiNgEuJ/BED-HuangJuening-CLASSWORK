const express=require('express');
const app=express();

app.get('/',(req,res) => {
    res.send('Welcome to the Book Category API');
});

app.get('/about',(req,res) => {
    res.send('Hello! I am a student at Ngee Ann Polytechnic studying Information Technology. I am currently learning how to build web servers with Node.js and Express.');
});

app.listen(3000,() => {
    console.log('Listening on port 3000');
});

app.get('/categories',(req,res) => {
    res.json([
        {id:1,name:'Fiction'},
        {id:2,name:'Non-Fiction'},
        {id:3,name:'Biography'},
    ]);
});