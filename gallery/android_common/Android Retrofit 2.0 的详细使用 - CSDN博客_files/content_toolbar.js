// Traffic Stats of the entire Web site By baidu end
var _gaq = [];
var userAgent = navigator.userAgent.toLowerCase();

    // Traffic Stats of the entire Web site By baidu
    var _hmt = _hmt || [];
    (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?6bcd52f51e9b3dce32bec4a3997715ac";
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(hm, s);
    })();
    // Traffic Stats of the entire Web site By baidu end

!(function(){
  var currUser={
      userName:"",
      userNick:'<a class="set-nick" href="https://passport.csdn.net/account/profile" target="_blank" rel="noopener">设置昵称<span class="write-icon"></span></a>',
      desc : '<a class="fill-dec" href="//my.csdn.net" target="_blank">编辑自我介绍，让更多人了解你<span class="write-icon"></span></a>',
      avatar:"//csdnimg.cn/public/common/toolbar/images/100x100.jpg"
    };
  var prodLogo = "none";
  var $oScriptTag =$("#toolbar-tpl-scriptId");
  var skin =$oScriptTag.attr("skin")=="black"?" csdn-toolbar-skin-black ":"";
  var fixed = $oScriptTag.attr("fixed")=="top"?" navbar-fixed-top ":"";
  var prodIndex= $oScriptTag.attr("domain")?$oScriptTag.attr("domain"):window.location.protocol+"//"+window.location.host;
      prodIndex+='_logo';
  var getCookie =function (objName){//获取指定名称的cookie的值
      var arrStr = document.cookie.split("; ");
      for(var i = 0;i < arrStr.length;i ++){
      var temp = arrStr[i].split("=");
      if(temp[0] == objName && objName=="UD") return decodeURIComponent(temp[1]);
      if(temp[0] == objName) return decodeURI(temp[1]);
      }
  }
  var setCookie = function (name,value) {
    var Days = 30;
    var exp = new Date();
    exp.setTime(exp.getTime() + Days*24*60*60*1000);
    document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();// + ";domain=.csdn.net;path=/";
  }
  var HTMLEncode =function(str) {
      var s = "";
      if(str.length == 0) return "";
      s = str.replace(/&/g, "&amp;").replace(//g, "&gt;").replace(/\'/g, "&#39;").replace(/\"/g, "&quot;");
      return s;
    }
  var AUtoAvatar = function(AU){
    if(!AU||!currUser.userName){
      return false;
    }
    var _AUPath = AU.split("").join("/");
    var userName = currUser.userName&&currUser.userName.toLowerCase();
    return "//avatar.csdn.net/"+_AUPath+"/2_"+userName+".jpg";
  }
  var hasLogin = false;
  var loginMark ="unlogin";
  function checkLogin(callback) {
          currUser.userNick = getCookie("UserNick") ||currUser.userNick;
          currUser.userName = getCookie("UserName") || currUser.userName;
          currUser.avatar = AUtoAvatar(getCookie("AU")) || currUser.avatar;
          currUser.desc = getCookie("UD") || currUser.desc;
          if(getCookie("UD")){
            currUser.desc = HTMLEncode(currUser.desc.replace(/\+/g," "));
          }
          callback(currUser);
    }
  checkLogin(function(currUser){
    if(currUser.userName){
        hasLogin = true;
    }
    loginMark = hasLogin?"":"unlogin";
  })

  /*
  * init pord logo
  */
  var prodJSON = {
      "blog" : "blog-icon",
      "download" : "down-icon",
      "bbs" : "bbs-icon",
      "my" :"space-icon",
      "code" : "code-icon",
      "share" : "share-icon",
      "tag" : "tag-icon",
      "dashboard":"dashboard-icon",
      "news" : "news-icon",
      "tag" : "tag-icon",
      "ask" : "ask-icon",
      "notify" : "notify-icon"
  }
  if(prodJSON[$oScriptTag.attr("prod")]){
    prodLogo=prodJSON[$oScriptTag.attr("prod")]||$oScriptTag.attr("prod");
  }

  //  festival customize 
    var start_time = 1522857600, // toolbar 特殊样式起始时间戳
        end_time = 1523116800,  // toolbar 特殊样式结束时间戳
        now_time = Math.floor(Date.now() / 1000), // 当前时间戳
        logo_tpl = '<svg class="icon" aria-hidden="true"><use xlink:href="#toolbar-csdnlogo"/></svg>',  // 正常样式
        logo_title = 'CSDN首页'; // 正常提示
        
        /**
         * [if description]
         * 当前时间在起始与结束时间内时触发
         */
        if(now_time > start_time && now_time<end_time){ logo_tpl="<img src="//csdnimg.cn/cdn/content-toolbar/qingming.png">" ;="" logo_title="清明节" }="" 因为="" logo="" 是svg="" 的，所以必须把="" iconfont.js="" 加入到代码里面="" $(document.body).prepend('<script="" class="toolbar-s" type="text/javascript" src="//csdnimg.cn/cdn/content-toolbar/iconfont.js">');

  // 注册url，https://passport.csdn.net/account/register

  var tpl ='\<div class="csdn-toolbar csdn-toolbar tb_disnone '+skin+fixed+'">\
        <div class="container row center-block ">\
          <ul class="pull-left left-menu clearfix">\
            <li>\
              <a href="//www.csdn.net" title="'+logo_title+'" target="_blank">'+logo_tpl+'</a>\
            </li>\
            <li><a href="//blog.csdn.net/" class="toolbar_to_feed" title="博客" target="_blank">博客</a></li>\
            <li><a href="//edu.csdn.net" title="学院" target="_blank">学院</a></li>\
            <li><a href="//download.csdn.net" title="下载" target="_blank">下载</a></li>\
            <li><a href="http://gitbook.cn/?ref=csdn" title="GitChat" target="_blank">GitChat</a></li>\
            <li class="tb_is1090hide"><a href="//bbs.csdn.net" title="论坛" target="_blank">论坛</a></li>\
            <li class="tb_is1150hide"><a href="//ask.csdn.net" title="问答" target="_blank">问答</a></li>\
            <li class="tb_is1210hide"><a href="//mall.csdn.net" title="商城" target="_blank">商城</a></li>\
            <li class="tb_is1270hide"><a href="//download.csdn.net/vip_code" title="下载VIP" target="_blank">VIP</a></li>\
            <li class="tb_is1330hide"><a href="//huiyi.csdn.net/" title="活动" target="_blank">活动</a></li>\
            <li class="tb_is1400hide"><a href="http://job.csdn.net" title="招聘" target="_blank">招聘</a></li>\
            <li class="tb_is1452hide"><a href="http://www.iteye.com" title="ITeye" target="_blank">ITeye</a></li>\
            <li class="tb_is1513hide"><a href="//www.gitee.com" title="码云" target="_blank">码云</a></li>\
            <li class="tb_is1513hide"><a href="http://www.csto.com" title="CSTO" target="_blank">CSTO</a></li>\
            <li class="show-more">\
            <a href="javascript:;" class="show-more-a" target="_blank" rel="noopener"><svg width="22" height="4" xmlns="http://www.w3.org/2000/svg"><path d="M2 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm9 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm9 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="#4F4F4F" fill-rule="evenodd"/></svg></a>\
              <div class="more">\
                <div class="tb_is1090show"><a href="//bbs.csdn.net" target="_blank">论坛</a></div>\
                <div class="tb_is1150show"><a href="//ask.csdn.net" target="_blank">问答</a></div>\
                <div class="tb_is1210show"><a href="//mall.csdn.net" target="_blank">商城</a></div>\
                <div class="tb_is1270show"><a href="//download.csdn.net/vip_code" target="_blank">下载VIP</a></div>\
                <div class="tb_is1330show"><a href="//huiyi.csdn.net/" target="_blank">活动</a></div>\
                <div class="tb_is1400show"><a href="http://job.csdn.net" target="_blank">招聘</a></div>\
                <div class="tb_is1452show"><a href="http://www.iteye.com" target="_blank">ITeye</a></div>\
                <div class="tb_is1513show"><a href="//www.gitee.com" target="_blank">码云</a></div>\
                <div class="tb_is1513show"><a href="http://www.csto.com" target="_blank">CSTO</a></div>\
              </div>\
            </li>\
          </ul>\
          <div class="pull-right login-wrap '+loginMark+'">\
            <ul class="btns">\
            <li class="toolbar-tracking csdn-tracking-statistics tracking-click" data-mod="popu_369"><a href="#" style="padding:0"></a></li>\
              <li>\
                <div class="search_bar csdn-tracking-statistics tracking-click" data-mod="popu_366">\
                  <input type="text" class="input_search" name="" id="toolber-keyword">\
                  <a href="//so.csdn.net/so/" target="_blank" class="btn-nobg-noborder btn-search"><i class="iconfont-toolbar toolbar-sousuo"></i></a>\
                </div>\
              </li>\
              <li class="write-bolg-btn csdn-tracking-statistics tracking-click" data-mod="popu_370"><a class="" href="//mp.csdn.net/postedit" target="_blank"><i class="iconfont-toolbar toolbar-icon_boke"></i><span>写博客</span></a></li>\
              <li class="gitChat"><a class="" href="http://gitbook.cn/new/gitchat/activity?utm_source=csdnblog1" target="_blank"><i class="iconfont-toolbar toolbar-icon_gitchatx"></i><span>发Chat</span></a></li>\
              <li class="userinfo"><a href="https://passport.csdn.net/account/login" target="_blank" rel="noopener">登录</a><span></span><a href="https://passport.csdn.net/account/mobileregister?action=mobileRegister" target="_blank" rel="noopener">注册</a></li>\
              <li class="userLogin">\
                <div class="loginCenter"><a href="//my.csdn.net" target="_blank"><img class="login_img" src="'+currUser.avatar+'"><div class="toolbar-circle"></div></a></div>\
                <div class="userControl">\
                  <div><a href="//blog.csdn.net/'+currUser.userName +'" target="_blank">我的博客</a></div>\
                  <div><a class="xiaoxi" href="http://msg.csdn.net/" target="_blank">消息<span class="toolbar-newsL">(3)</span></a></div>\
                  <div><a href="//my.csdn.net/my/account/changepwd" target="_blank">帐号设置</a></div>\
                  <div><a href="//bbs.csdn.net/forums/Service" target="_blank">反馈</a></div>\
                  <div><a href="http://oldblog.csdn.net/home/help.html" target="_blank">帮助</a></div>\
                  <div><a href="//passport.csdn.net/account/logout">退出</a></div>\
                </div>\
              </li>\
            </ul>\
          </div>\
        </div>\
    </div>';
  $(document.body).prepend($(tpl));
  var timeOut = 1;
  if((window.location.host.indexOf('bbs.csdn.net')>-1 && window.location.pathname.indexOf('home')>-1)||(window.location.host.indexOf('bbs.csdn.net')>-1 && window.location.pathname.indexOf('forums')>-1)){
    $('.csdn-toolbar').addClass('csdn-toolbarbbshome')
  }
  function istracking(){
    if(timeOut>10){
      console.log('网速过差或未加载mainjs');
      return false;
    } 
    try {
      if(typeof(csdn.trackingAd) === 'function'){
        bindTracking();
      }else{
        timeOut++;
        setTimeout(istracking,1000);
      }
    } catch (e) {
      timeOut++;
      setTimeout(istracking,1000);
    }
  }
  istracking();
  function bindTracking(){
    csdn.trackingAd('.toolbar-tracking', {
        pid: 'toolbar',
        mod: 'popu_366',
        mtp: '1'
    });
    // search_bar
    csdn.trackingAd('.search_bar', {
        pid: 'toolbar',
        mod: 'popu_369',
        mtp: '1'
    });
    
    csdn.trackingAd('.write-bolg-btn', {
        pid: 'toolbar',
        mod: 'popu_370',
        mtp: '1'
    });
  }

  (function() {
    if(!hasLogin) return ;
    var url = '//svc-notify.csdn.net/get_unread?jsonpcallback=?'
    $.ajax({
      url: url,
      data: {},
      dataType: 'jsonp', // TODO jsonp方式调用不能产生正确的timeout错误等，考虑换成支持跨域的xhr(在ff chrome ie8+)
      success: function (json) {
        // var $userControl = $('.userControl');
        if(json.count > 0){
          var length = json.count;
          // $userControl.css({'width':100,'right':-26})
          if (length>99){
             length = 99;
              // $userControl.css({'width':110,'right':-16})
          }
          $('.toolbar-circle').fadeIn();
          $('.toolbar-newsL').html('('+length+')').css({'marginLeft':4}).fadeIn();
          
          $(document).on('click','.xiaoxi',function(){
            $('.toolbar-circle').fadeOut()
            $('.toolbar-newsL').fadeOut()
          })
        }
      }
    });
  })()
})();

// hover
$(function(){
  var moreHover={
    showMore: function(){
      var $dom = $('.show-more .more');
      if($dom.is(":animated")){
        $dom.stop(true,true).fadeIn(200);
      }
      $dom.stop(true,true).fadeIn(200);
    },
    hideMore:function(){
      var $dom = $('.show-more .more');
      if($dom.is(":animated")){
        $dom.stop(true,true).fadeIn(200);
      }
      $dom.stop(true,true).fadeOut(300);
    }
  }
  var userHover={
    showMore: function(){
      var $dom = $('.userControl');
      if($dom.is(":animated")){
        $dom.stop(true,true).fadeIn(200);
      }
      $dom.stop(true,true).fadeIn(200);
    },
    hideMore:function(){
      var $dom = $('.userControl');
      if($dom.is(":animated")){
        $dom.stop(true,true).fadeIn(200);
      }
      $dom.stop(true,true).fadeOut(300);
    }
  }
  $('.show-more').hover(moreHover.showMore,moreHover.hideMore)
  $('.userLogin').hover(userHover.showMore,userHover.hideMore)
  
  

})
// search
$(function(){
  //获取 网站位置 
  function getT(){
    var title = window.location.host.split( ".",1)[0];
    var t = ''
        switch (title) {
          case 'www':
            t = ' '
            break;
          case 'blog':
            t = 'blog'
            break;
          case 'blog':
            t = 'codes_snippet'
            break;
          case 'bbs':
            t = 'discuss'
            break;
          case 'download':
            t = 'doc'
            break;
          case 'geek':
            t = 'news'
            break;
          case 'edu':
            t = 'course'
            break;
          default:
            t = ' '
        }
    return t;
  }
  function goFn(obj,txt){
      var searchTxt = encodeURIComponent(txt),
              url = "//so.csdn.net/so/search/s.do?q="+searchTxt + "&t="+getT()+"";
      if(searchTxt == ''){
          return false;
      }else{
        window.open(url)
          // window.location.href = url;
      }
    
  }
    var searchBtn = $(".btn-search"),
            searchInpt = $(".input_search"),
            _this = this;
    searchBtn.on("click", function (e) {
        goFn($(this), $(this).prev("input").val());
        //do something for myself
        e.preventDefault();
    });

    searchInpt.keyup(function (event) {
        var evCode = event.keyCode;
        if(evCode == 13) {
            var searchTxt = encodeURIComponent($(this).val()),
                url = "//so.csdn.net/so/search/s.do?q=" + searchTxt + "&t="+getT()+"";
            // window.location.href = url;
            window.open(url)
        
        }
    });
    // 绑定删除方法
    $(document).on('click','.toolbar_delete_bar',function(){
      $('.input_search').val(' ')
    })
    
    $(document).on('click','.btn_clear',function(){
      $('.input_search').val('');
      transform_search_icon()
      isInputSearch = false
    })
    function transform_search_icon(){
      if($('.btn-search').length>0){
        $('.btn-search').detach();
        $('.search_bar').append('<a href="javascript:;" class="btn-nobg-noborder btn_clear" target="_blank" rel="noopener"><i class="iconfont-toolbar toolbar-guanbi1"></i></a>');
      }else{
        $('.btn_clear').detach();
        $('.search_bar').append('<a href="//so.csdn.net/so/" target="_blank" class="btn-nobg-noborder btn-search"><i class="iconfont-toolbar toolbar-sousuo"></i></a>');
      }
    }
    // toolbar_prompt_hover($('.write-bolg-btn a'),'写博客')
    // toolbar_prompt_hover($('.gitChat a'),'发布Chat')
    // toolbar_prompt_hover($('.search_bar'),'err')
    function toolbar_prompt_hover(e,text){
      e = e instanceof jQuery ? e:$(e);
      e.css({'position':'relative'})
      var con = {
                e:e,
                text:text,
                isbind:false
       },
        isHave = false;
      this.events = this.events ? this.events : [con];
      for (var i = 0; i < this.events.length; i++) {
        if(this.events[i].e[0] == e[0]){
          this.events[i].text = text;
          this.events[i].e.children('.toolbar-prompt-box').text(this.events[i].text);
          isHave = true;
        }
      }
      if(!isHave){
        this.events.push(con);
        isHave= false
      }
      if(!this.events[this.events.length-1].isbind){
        toolbar_binding(this.events[this.events.length-1])
        this.events[this.events.length-1].isbind = true;
      }
    }
    function toolbar_binding(evens){
      // console.log(evens);
          var even = evens.e;
              t = evens.text;
          even.append(toolbar_tpls(t))
          var even_children = even.children('.toolbar-prompt-box'),
              even_children_w = even_children.width(),
              even_width = even.width();
          even_children.css({'left':-((even_children_w+16-even_width)/2)}).children().css({'left':(even_children_w+16)/2-5})
          even.hover(toolbar_prompt_show,toolbar_prompt_hide)
    }
    function toolbar_tpls(t) {
      var tpl = '<div class="toolbar-prompt-box">\
                  <div class="arrow"></div>\
                  <span>'+t+'</span>\
                </div>';
                return tpl;
    }
    function children_show(t){
      $(t).children('.toolbar-prompt-box').fadeIn(500)  
    }
    var clearTime;//计时器id
    function toolbar_prompt_show() {
      if($(this).children('.toolbar-prompt-box').is(":animated")){
        $(this).children('.toolbar-prompt-box').stop(true,true).css({'display':'block'})
      }else{
        clearTime = setTimeout(children_show,1000,this);
      }
    }
    function toolbar_prompt_hide() {
      clearTimeout(clearTime)
      $(this).children('.toolbar-prompt-box').fadeOut(500)

    }
  // 阻止
  $(document).on('click','.prevent_a',function(e){
    e.preventDefault();
  });

    function loadScript(url, callback){
        var script = document.createElement ("script")
        script.type = "text/javascript";
        if (script.readyState){ //IE
            script.onreadystatechange = function(){
                if (script.readyState == "loaded" || script.readyState == "complete"){
                    script.onreadystatechange = null;
                    callback();
                }
            };
        } else { //Others
            script.onload = function(){
                callback();
            };
        }
        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    }

    loadScript("//csdnimg.cn/search/baidu_opensug-1.0.0.js",function(){
        BaiduSuggestion.bind("toolber-keyword",{
            "XOffset":"0",
            "YOffset":"-5",
            "fontSize":"14px",		//文字大小
            "width" : 164,
            "line-height" : "30px",
            "padding" : "0 5px",
            "borderColor":"#e2e2e2", 	//提示框的边框颜色
            "bgcolorHI":"#f44444",		//提示框高亮选择的颜色
            "sugSubmit":false		//在选择提示词条是是否提交表单
        });
    });

})
</end_time){>