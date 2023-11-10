const { resolve } = require("app-root-path");
const { LineClient, Line } = require("messaging-api-line");
const fs = require("fs");
const {convertArrayToCSV} = require('convert-array-to-csv');
const { time } = require("console");
require("dotenv").config();

let baseURL = process.env.BASE_URL;
const imageURL = `${baseURL}/static/images`;// image 路徑
let userId,userName,userPictureUrl,memberName; // getprofile 會用到
// let dataArraysOfUser = [];

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
    localTime = dateTime.toLocaleString('zh-TW',{hour12: false})
    switch (message.text){
        case 'Who am I' :
        case '我是誰' : 
            client.getUserProfile(source.userId).then((profile) => {
            console.log(profile);
            userId = profile.userId;
            userName = profile.displayName;
            userPictureUrl = profile.pictureUrl;
            replyMsg = `你的id為:${userId}\n你的名字為:${userName}\n你的照片為:${userPictureUrl}`;
            // console.log(replyMsg);
            client.replyText(replyToken,replyMsg);
            });
            break;
        case '我有問題': // 提問關鍵字
            client.getGroupMemberProfile(source.groupId,source.userId).then((member) => {
                replyMsg = `Hello,${member.displayName},\n工單開始時間為:\n${localTime}`;
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
                
            })
            recordProblems(source.userId,localTime);
            break;
        case '我沒問題了':
            closeTask(replyToken,localTime,source);
            break;
            // client.replyConfirmTemplate(replyToken, '完成工單確認', {
            //     text: '確定要結束這張工單嗎？',
            //     actions: [
            //       {
            //         type: 'message',
            //         label: 'Yes',
            //         text: 'yes',
            //       },
            //       {
            //         type: 'message',
            //         label: 'No',
            //         text: 'no',
            //       },
            //     ],
            // });
            
        // case 'yes':
        //     closeTask(replyToken,localTime,source);
        //     break;
        // case 'no':
        //     client.replyText(replyToken,'If you still have some questions, please wait for professional people to help you');
        //     break;
    };
}; //end of handleText



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

    console.log(postbackData); // print user action

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
            // 紀錄 action=orderproblem into Problem.csv


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
            // GetUserProfile(replyToken,source);
            break;

        case startProblem:
            handleText();  
            break;

        case 'finish':
            replyMsg = '感謝您的提問，希望我有幫助到您。';
            client.replyText(replyToken,replyMsg);
            break;

        default:
            replyMsg = '若有問題需協助排除，請聯繫客服專員。';
            client.replyText(replyToken,replyMsg);
            break;
    }; // end of switch

    recordAction(source.userId,postbackData);
    
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
  
// user / line-bot 加入群組
const handleJoin = (replyToken,source) => {
    let items = '';
    items = {
        text:'我是客服小幫手，請先將我『加為好友』！',
        actions:[
            {
                type:'uri',
                label:'加我好友解鎖更多功能',
                uri:'https://lin.ee/vlkg5Rn',
            },
        ],
    };
    client.reply(replyToken,[
        Line.createButtonTemplate('Welcome Template',items),
        Line.createSticker({packageId:'8525',stickerId:'16581296'}),
    ]);
};

// 加入好友 發送的訊息
const handleFollow = (replyToken,source) => {
    let followMsg = '';
    followMsg = '感謝您的加入，有任何問題請在「群組」向我提問。';
    writeIntoCSV(source.userId,replyToken);
    return client.replyText(replyToken,followMsg);
}; // end of handleFollow

// 寫成csv
const writeIntoCSV = (userId,replyToken) => {
    let dataOfUser = [];
    const header = ['UserID','ReplyToken']; // Profile的header
    let dataArrays = [];

    dataOfUser.push(userId,replyToken); // 先將 userId 和 replyToken 存至 dataOfUser array
    // data.push(replyToken);
    dataArrays.push(dataOfUser); // 再把 dataOfUser array 存至 dataArrays

    // console.log(dataOfUser);
    const csvFromdataOfUser = convertArrayToCSV(dataArrays);
    // console.log(csvFromdataOfUser);

    //  將 array 寫成 csv file
    const csvFromArrayOfArrays = convertArrayToCSV(dataArrays,{
        header,
        separator:','
    });

    console.log(csvFromArrayOfArrays);

    if (fs.existsSync('Profile.csv')) {
        console.log("YES");
        fs.appendFile('Profile.csv',csvFromdataOfUser,(err) => {
            if (err) {
                console.log(err);
            }
            console.log('CSV file exited and saved successfully!');
        });
    } else {
        console.log("Do not exit");
        fs.writeFile('Profile.csv',csvFromArrayOfArrays,(err) => {
            if (err) {
                console.log(err);
            }
            console.log('CSV file saved successfully!');
        })
    } 
}

const recordProblems = (userId,time) => {
    let dataOfProblem = [];
    const header = ['UserID','StartedTime']; // Problem的header
    let problemArrays = [];

    dataOfProblem.push(userId,time); // 先將 userId 和 time 存至 dataOfProblem array
    // data.push(replyToken);
    problemArrays.push(dataOfProblem); // 再把 dataOfProblem array 存至 problemArrays

    // console.log(dataOfProblem);

    const csvFromdataOfProblem = convertArrayToCSV(problemArrays);
    //  將 array 寫成 csv file
    const csvFromArrayOfArrays = convertArrayToCSV(problemArrays,{
        header,
        separator:','
    });
    if (fs.existsSync('Problem.csv')) {
        fs.appendFileSync('Problem.csv',csvFromdataOfProblem,(err) => {
            if (err) {
                console.log(err);
            }
            console.log('CSV file exited and saved successfully!');
        });
    } else {
        fs.writeFileSync('Problem.csv',csvFromArrayOfArrays,(err) => {
            if (err) {
                console.log(err);
            }
            console.log('CSV file saved successfully!');
        })
    }   
}

const closeTask = (replyToken,time,source) => {
    // 回覆工單已完成，有需要再通知我！
    // 紀錄工單結束時間
    
    client.replyText(
        replyToken,
        '如果工單已結束，請點擊完成工單按鈕！',
        {
          quickReply: {
            items: [
              {
                type: 'action',
                action: {
                  type: 'postback',
                  label: '完成工單',
                  data:'finish'
                },
              },
              {
                type: 'action',
                action: {
                  type: 'postback',
                  label: '還有問題',
                  data: 'start',
                },
              },
              
            ],
          },
        }
      ).then(
        console.log(`工單結束時間為：${time}`),
        pushForm('Hello World',source));

    // let replyMsg = '';
    // replyMsg = '您的工單已結束，若有問題歡迎提問！';
    // client.replyText(replyToken,replyMsg);
    
    // recordProblems(source.userId,time);
}

const recordAction = (userId,postbackData) => {
    let dataOfAction = [];
    let actionArrays = [];
    let header = ['userId','data'];

    dataOfAction.push(userId,postbackData); // 先將 userId 和 time 存至 dataOfProblem array
    // data.push(replyToken);
    actionArrays.push(dataOfAction); // 再把 dataOfProblem array 存至 problemArrays

    // console.log(dataOfProblem);

    const csvFromdataOfAction = convertArrayToCSV(actionArrays);
    //  將 array 寫成 csv file
    const csvFromArrayOfArrays = convertArrayToCSV(actionArrays,{
        header,
        separator:','
    });
    if (fs.existsSync('ProblemType.csv')) {
        fs.appendFileSync('ProblemType.csv',csvFromdataOfAction,(err) => {
            if (err) {
                console.log(err);
            }
            console.log('CSV file exited and saved successfully!');
        });
    } else {
        fs.writeFileSync('ProblemType.csv',csvFromArrayOfArrays,(err) => {
            if (err) {
                console.log(err);
            }
            console.log('CSV file saved successfully!');
        })
    }   
};

// 需要有group ID
const getGroupName = () => {

}

const pushForm = (groupId,text) => {
    client.pushText(groupId,text);
};

module.exports = { handleMessage,handlePostBack,handleFollow,handleJoin,pushForm };