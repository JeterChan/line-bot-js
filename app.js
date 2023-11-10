// router
const { handleMessage, handleFollow, handlePostBack, handleJoin,pushForm} = require('./src/apis/utils');
const {showInputText} = require('./src/apis/api');

const express = require("express");
const bodyParser = require("body-parser");
const { LineClient } = require("messaging-api-line");
const cors = require('cors');
require("dotenv").config();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret:process.env.CHANNEL_SECRET
};
const PORT = process.env.PORT || 3000;

// // get accessToken and channelSecret from LINE developers website
const client = new LineClient({
  accessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
});

const corsOptions = {
  origin:[
    'http://localhost:8888',
  ],
  methods:'GET,POST,DELETE,PUT,PATCH',
  allowedHeaders:['Content-Type','Authorization'],
};

const app = express();
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use('/static',express.static('static'));
app.use(cors(corsOptions));
app.set('view engine','ejs');

let replyTime;// 抓取response當下的時間

// 如何取得群組的group ID?
// 在開啟每一則工單的時候，將groupID存入DB
// 透過group ID 呼叫 getGroupName 抓取群組名稱，並將之儲存至DB
// 在內部網站可以藉由下拉式選單顯示『群組名稱』
// 客服透過過web上button傳送發送客製化訊息(ex.客服滿意度問卷)結束工單
app.post("/getDataFromWeb",(req,res) => {
  const inputText = req.body.inputText;
  console.log(inputText)
  const myText = showInputText(inputText);
  console.log(myText)
  pushForm('Cd74b1ea12e251c04ab50109679bc0d4f',myText);
})
// webhook router
app.post("/webhook",(req, res) => {
  Promise
  .all(req.body.events.map(handleEvent))
  .then((result) => {
    res.json(result);
    const event = new Date();
    replyTime = event.toLocaleString('zh-TW',{hour12:false});
    console.log(`Line bot 回覆時間:${replyTime}`);
  });
});



// 所有 requset 都會經過 handleEvent function
const handleEvent = (event) => {
  console.log(event);
  const dateTime = new Date(event.timestamp);
  console.log(`User傳訊息的時間:${dateTime.toLocaleString('zh-TW',{hour12: false})}`);
  switch(event.type){
    case 'message':
      handleMessage(event.message,event.replyToken,event.source,event.timestamp);
      break;
    case 'follow':
      handleFollow(event.replyToken,event.source);
      break;
    case 'postback':
      handlePostBack(event.postback,event.replyToken,event.source);
      break;
    case 'memberJoined': // user 加入群組
    case 'join': // 機器人加入群組
      handleJoin(event.replyToken,event.source);
      break;
    default:
      return Promise.resolve(null);
  };

};// end of handleEvent


app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});