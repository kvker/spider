const config = require('./config/index')
const request = require('superagent')
const fs = require('fs')
const cheerio = require('cheerio')
const exec = require('child_process').exec
// start page
let page = 1
  , pageCurrentLength = 0
  , pageMaxLength = 1
  , total = 1446

function restart() {
  pageCurrentLength = 0
  // debugger
  // if(page > 2) return
  request
    .get(`https://www.pixiv.net/bookmark.php?rest=show&p=${page}`)
    .set('cookie', config.cookie)
    .set('referer', config.referer)
    .end((err, res) => {
      if(err) {
        console.log(err)
      }
      const result = res.text
      $ = cheerio.load(result)
      let thumbnails = $('._layout-thumbnail>img')
        , titles = $('a>h1.title')

      // max length base on thumbnails length
      pageMaxLength = thumbnails.length
      Array.from(thumbnails).forEach(async (thumbnail, index) => {
        // debugger
        // if(index) return
        let imgUrl = thumbnail.attribs['data-src']
          , imgFix = imgUrl.match(/\.\w+$/)[0]
          , imgTitle = titles[index].attribs.title
          , imgName = imgTitle + imgFix
          // normal rule with scale img and origin img.
          , originImgUrl = imgUrl.replace(/\/c\/150x150\/img-master(.*?)_master1200/, '/img-original$1')

        checkLinkStatus({ imgTitle, imgName, originImgUrl }, index)
      })
    })
}

function checkLinkStatus({ imgTitle, imgName, originImgUrl }, index) {
  request.head(originImgUrl)
    .set('cookie', config.cookie)
    .set('referer', config.referer)
    .end((err, res) => {
      // img's suffix maybe wrong. then should change to another one.(png and jpg)
      if(err) {
        let originImgUrlFix = originImgUrl.match(/\.\w+$/)[0]
          , png = '.png'
          , jpg = '.jpg'
        if(originImgUrlFix === png) {
          imgName = imgTitle + jpg
          originImgUrl = originImgUrl.replace(/\.\w+$/, jpg)
        }
        else {
          imgName = imgTitle + png
          originImgUrl = originImgUrl.replace(/\.\w+$/, png)
        }
      }
      setTimeout(downloadFile.bind(null, { imgTitle, imgName, originImgUrl }), config.timeout * index);
    })
}

function downloadFile({ imgTitle, imgName, originImgUrl }) {
  // ignore '/' error
  let stream = fs.createWriteStream(`./pixiv_col/imgs/${imgName.replace(/\//g, '')}`)
    , req = request.get(originImgUrl)
      .set('cookie', config.cookie)
      .set('referer', config.referer)

  req.pipe(stream)

  req.on('end', () => {
    console.log(pageCurrentLength + pageMaxLength * page - pageMaxLength + 1 + '/' + total)
    if(++pageCurrentLength >= pageMaxLength) {
      restart(++page)
      exec(`echo ${pageCurrentLength} >> pixiv_col/length.txt;echo ${page} >> pixiv_col/page.txt`)
    }
  })
}

restart()