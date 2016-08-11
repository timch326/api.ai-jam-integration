const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('static'));

app.listen(port, function() {
  console.log(`Server started at port ${port}`);
});
