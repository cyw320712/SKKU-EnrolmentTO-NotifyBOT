const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const path = require('path');
const ejs = require('ejs');
const beep = require('node-beep');
const fs = require('fs');

const updatePeriod = 30000; // 30000ms (30s)
const updatePeriodError = 3000; //3000ms (3s)
const interval = 15000; //15000ms (15s)
let beforePeriod = 0;
let updateIndex = 0;

let requestBundle = null;

app.listen(9900, async() => {
    console.clear();
    console.log('Fetching user request parameters....');
    await get_user_request();
    console.log('Macro start....');
    macro_script();
});

function get_user_request(){
    let rawJson = fs.readFileSync("key.json");
    requestBundle = JSON.parse(rawJson);
}

async function macro_script(){
    const browser = await puppeteer.launch({
        headless: true,
    });
    console.log("Chromium Browser launched.");
    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 1080
    });

    console.log("Logging in to sugang.skku...");
    await page.goto("http://sugang.skku.edu/skku");
    await page.evaluate((id, pw) => {
        document.querySelector('iframe').contentDocument.querySelector('.login input[name="id"]').value = id;
        document.querySelector('iframe').contentDocument.querySelector('.login input[name="pwd"]').value = pw;
        document.querySelector('iframe').contentDocument.querySelector('#btn_login').click();
    }, requestBundle.studentID, requestBundle.password);

    await updatePage(page);
    let period = getRandom(updatePeriod);
    setInterval(updatePage, period, page);
    beforePeriod = period;
}

async function updatePage(page){
    await page.waitFor(1000);
    await page.evaluate(() => {
        document.querySelector('iframe')
            .contentDocument.querySelector('iframe')
            .contentDocument.querySelector('frame')
            .contentDocument.querySelectorAll('ul li')[1]
        .querySelector('a').click();
        return 0;
    });

    await page.waitFor(1000);

    let resBody = await page.evaluate(() => {
        let applyTable = document.querySelector('iframe')
            .contentDocument.querySelector('iframe')
            .contentDocument.querySelector('frameset')
            .querySelectorAll('frame')[1].contentDocument.documentElement.innerHTML;
        return applyTable;
    });
    const $ = cheerio.load(resBody);
    const lectureList = $('#listLecture tr');
    
    console.clear();
    console.log("Page Watching #"+updateIndex++ +" ["+new Date().format('yyyy-MM-dd a/p hh:mm:ss')+"]\n\n");

    for(let i=0;i<lectureList.length;i++){
        const elem = cheerio(lectureList[i]);
        const elemClass = elem.attr('class');
        if(elemClass.includes("firstrow"))continue;
        const elemId = elem.attr('id');

        const haksuNum = $(`#listLecture tr[id="${elemId}"] td[aria-describedby="listLecture_haksu_no"]`);
        let isAnythingAvailable = false;
        if(isMatchedTitle(haksuNum.text())){
            const lectureName = $(`#listLecture tr[id="${elemId}"] td[aria-describedby="listLecture_gyogwamok_nm"]`).text();
            const lectureTO = $(`#listLecture tr[id="${elemId}"] td[aria-describedby="listLecture_tot_dhw"]`).text();
            const TO = splitTOstring(lectureTO);
            let available = TO.tot>TO.sub;

            available?process.stdout.write('\u001b[32m'):process.stdout.write('\u001b[31m');
            process.stdout.write(paddingAfter(haksuNum.text(),12)+" "+lectureName+"\nTO: "+TO.sub+"/"+TO.tot);
            available?process.stdout.write('\u001b[0m'):process.stdout.write('\u001b[m');
            process.stdout.write("\n");
            isAnythingAvailable = isAnythingAvailable | available;
        }

        if(isAnythingAvailable)beep();
    }
}

function getRandom(offset){
    //Because server managers detects this macro, need to act more like a human.
    //period (offset - interval ~ offset + interval)
    
    if (beforePeriod == 0)
        return Math.floor((Math.random()-0.5)*2*interval) + offset;
    let time = offset + interval - beforePeriod;
    beforePeriod = 0;
    return time;
    
    // return Math.floor(Math.random()*2*phase) + offset;
}

function isMatchedTitle(title){
    for(let i=0;i<requestBundle.waitingList.length;i++){
        if(requestBundle.waitingList[i] == title){
            return true;
        }
    }
    return false;
}

function splitTOstring(str){
    let regex = new RegExp("/ ");
    let seg = str.split(regex);
    return {
        sub: parseInt(seg[0]),
        tot: parseInt(seg[1]),
    }
}

function paddingAfter(str, pad){
    let newStr = str;
    for(let i=0;i<pad-str.length;i++) newStr+=" ";
    return newStr;
}

Date.prototype.format = function (f) {
    if (!this.valueOf()) return " ";

    var weekKorName = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    var weekKorShortName = ["일", "월", "화", "수", "목", "금", "토"];
    var weekEngName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var weekEngShortName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var d = this;
    return f.replace(/(yyyy|yy|MM|dd|KS|KL|ES|EL|HH|hh|mm|ss|a\/p)/gi, function ($1) {
        switch ($1) {
            case "yyyy": return d.getFullYear(); // 년 (4자리)
            case "yy": return (d.getFullYear() % 1000).zf(2); // 년 (2자리)
            case "MM": return (d.getMonth() + 1).zf(2); // 월 (2자리)
            case "dd": return d.getDate().zf(2); // 일 (2자리)
            case "KS": return weekKorShortName[d.getDay()]; // 요일 (짧은 한글)
            case "KL": return weekKorName[d.getDay()]; // 요일 (긴 한글)
            case "ES": return weekEngShortName[d.getDay()]; // 요일 (짧은 영어)
            case "EL": return weekEngName[d.getDay()]; // 요일 (긴 영어)
            case "HH": return d.getHours().zf(2); // 시간 (24시간 기준, 2자리)
            case "hh": return ((h = d.getHours() % 12) ? h : 12).zf(2); // 시간 (12시간 기준, 2자리)
            case "mm": return d.getMinutes().zf(2); // 분 (2자리)
            case "ss": return d.getSeconds().zf(2); // 초 (2자리)
            case "a/p": return d.getHours() < 12 ? "오전" : "오후"; // 오전/오후 구분
            default: return $1;
        }
    });
};


String.prototype.string = function (len) { var s = '', i = 0; while (i++ < len) { s += this; } return s; };
String.prototype.zf = function (len) { return "0".string(len - this.length) + this; };
Number.prototype.zf = function (len) { return this.toString().zf(len); };