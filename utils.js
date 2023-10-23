const { LineClient, Line } = require("messaging-api-line");
require("dotenv").config();

let baseURL = process.env.BASE_URL;
const imageURL = `${baseURL}/static/images`;// image 路徑
let userId,userName,userPictureUrl,memberName; // getprofile 會用到

const client = new LineClient({
    accessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
});

const handleMessage = (message,replyToken,source,timestamp) =>{
    //  判斷messge.type是text image ...
    switch(message.type){
      case 'text':
        handleText(message,replyToken,source,timestamp);
        break;
      default:
        reply(replyToken,[{
          type:'text',
          text:'抱歉，我不懂你的意思。'
        }])
        break;  
    };
}; // end of handleMessage

// 處理 message.type == text 的 requset
const handleText = (message,replyToken,source,timestamp) => {
    let replyMsg = '';
    let replyButton;
    const dateTime = new Date(timestamp);
    switch (message.text){
      case 'Who am I' :
      case '我是誰' : 
        client.getUserProfile(source.userId).then((profile) => {
          // console.log(profile);
          userId = profile.userId;
          userName = profile.displayName;
          userPictureUrl = profile.pictureUrl;
          replyMsg = `你的id為:${userId}\n你的名字為:${userName}\n你的照片為:${userPictureUrl}`;
          // console.log(replyMsg);
          client.replyText(replyToken,replyMsg);
        });
        break;
      case '我有問題':
        console.log(message);
        memberName = GetUserProfile(source);
        replyMsg = `Hello,${memberName},工單開始時間為:${dateTime.toLocaleString('zh-TW',{hour12: false})}`;
        replyButton = {
          thumbnailImageUrl : `${imageURL}/question.jpg`,
          title : '請問是哪種問題呢？',
          text: '請選擇',// 一定要放
          actions : [
            {
              type: 'postback',
              label: '訂單問題',
              data: 'action=orderproblem',
            },
            {
              type: 'postback',
              label: '付款問題',
              data: 'action=paymentproblem',
            },
            {
              type: 'postback',
              label: '系統操作問題',
              data: 'action=systemproblem',
            },
          ],
        }; // end of replyButton

        client.reply(replyToken,[
            Line.createText(replyMsg),
            Line.createButtonTemplate('問題選項',replyButton),
        ]);
        break;
    };
}; //end of handleText

// 加入好友 發送的訊息
const handleFollow = (replyToken) => {
    let followMsg = '';
    followMsg = '感謝您的加入，有任何問題請輸入『我有問題』。';
    return client.replyText(replyToken,followMsg);
}; // end of handleFollow

  // 處理 postback event 
const handlePostBack = (postback,replyToken,source) => {
    let replyButton; // 儲存 button template 的回傳值
    let replyMsg; // 儲存 text 的回傳值
    const postbackData = postback.data; // 透過 data 判斷 User 使用的行為
    const actionList = ['action=orderproblem','action=paymentproblem','action=systemproblem'];
    const orderProblemList = ['order=canNotCreateOrder','order=canNotDeleteOrder','order=canNotUpdateOrder'];
    const paymentProblemList = ['payment=canNotPayForOrder','payment=duplicatePayment'];
    const startProblem = 'haveProblems';
    const joinText = 'action=join';
    const paymentText = 'payment';
    switch (postbackData){
        case actionList[0]: // 訂單問題
            replyButton = {
            thumbnailImageUrl : `${imageURL}/receipt.jpg`,
            title : '訂單遇到什麼問題呢？',
            text:'請選擇',
            actions : [
                {
                type: 'postback',
                label: '無法下訂單',
                data: 'order=canNotCreateOrder',
                },
                {
                type: 'postback',
                label: '無法取消訂單',
                data: 'order=canNotDeleteOrder',
                },
                {
                type: 'postback',
                label: '無法更改訂單',
                data: 'order=canNotUpdateOrder',
                },
            ],
            };
            client.replyButtonTemplate(replyToken,'訂單問題',replyButton);
            break;  
         
        case actionList[1]: // 付款問題
            replyButton = {
            thumbnailImageUrl : `${imageURL}/payment.jpg`,
            title : '付款遇到什麼問題呢？',
            text:'請選擇',
            actions : [
                {
                type: 'postback',
                label: '無法結帳',
                data: 'payment=canNotPayForOrder',
                },
                {
                type: 'postback',
                label: '重複扣款',
                data: 'payment=duplicatePayment',
                },
            ],
            };
            client.replyButtonTemplate(replyToken,'付款問題',replyButton);
            break;
            
        case actionList[2]: // 系統操作問題
            replyMsg = '系統操作問題將由客服專員為您服務。';
            client.replyText(replyToken,replyMsg);
            break;
  
        case orderProblemList[0]:
        case orderProblemList[1]:
        case orderProblemList[2]:
            handleOrder(replyToken,source);
            break;
  
        case paymentProblemList[0]:
        case paymentProblemList[1]:
        case paymentProblemList[2]:
            handlePayment(replyToken,source);
            break;

        case joinText:
            GetUserProfile(replyToken,source);
            break;

        case startProblem:
            handleText();  
            break;

        default:
            replyMsg = '若有問題需協助排除，請聯繫客服專員。';
            client.replyText(replyToken,replyMsg);
            break;
    }; // end of switch
    
}; // end of handlePostBack

const handleOrder = (replyToken,source) => {
    let replyMsg;
    client.getUserProfile(source.userId).then((profile) => {
      userName = profile.displayName;
      replyMsg = `${userName} 先生/小姐您好，請描述您的問題，我們將會記錄起來並交由客服專員為您服務。`;
      client.replyText(replyToken,replyMsg);
    });
} // end of handleOrder
  
const handlePayment = (replyToken,source) => {
    let replyMsg;
    client.getUserProfile(source.userId).then((profile) => {
        userName = profile.displayName;
        replyMsg = `${userName} 先生/小姐您好，請描述您的問題，我們將會記錄起來並交由客服專員為您服務。`;
        client.replyText(replyToken,replyMsg);
    });
}// end of handlePayment
  
const handleJoin = (replyToken,source) => {
    let items = '';
    items = {
        text:'點擊下方的按鈕讓我更認識你喔！',
        actions:[
            {
                type:'postback',
                label:'加我好友解鎖更多功能',
                data:'action=join',
            },
        ],
    };
    client.reply(replyToken,[
        Line.createButtonTemplate('Welcome Template',items),
        Line.createSticker({packageId:'8525',stickerId:'16581296'}),
    ]);
};

// 抓取 Group Member 的資訊，回傳姓名跟 Member 打招呼
const GetUserProfile = (source) => {
    let memberDisplayName = '';
    client.getGroupMemberProfile(source.groupId,source.userId).then((member) => {
        // memberDisplayName = `Hello,${member.displayName}\n有任何疑問歡迎使用對話框底部的快速呼叫按鈕!`;
        // client.replyText(replyToken,memberProfileMsg);
        memberDisplayName = member.displayName;
    });  
    console.log(memberDisplayName);
    return memberDisplayName;  
};

module.exports = { handleMessage,handlePostBack,handleFollow,handleJoin };