const { handleMessage, handleFollow, handlePostBack, handleJoin} = require('./utils');

const express = require("express");
const bodyParser = require("body-parser");
const { LineClient } = require("messaging-api-line");
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

const app = express();
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use('/static',express.static('static'));
// app.use(morganMiddleware);

app.get("/", (req, res) => {
  res.sendStatus(200);
});

let replyTime;// 抓取response當下的時間

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