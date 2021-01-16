var flns_config = {
    "cdn_urls": ["cdn2.f-cdn.com", "cdn3.f-cdn.com", "cdn5.f-cdn.com", "cdn6.f-cdn.com"],
    "cookie_base": "GETAFREE",
    "notify_server": "//notifications.freelancer.com",
    "site_name": "Freelancer.com",
    "cookie_domain": ".freelancer.com"
}

var fl_status = 'uninitialized'
var flSock
var user_jobs = []
var cookie_store = '';
var cookie_temp = '';
var forceStopStatus = false;


var change_status = function (status) {
    console.log('status: ' + status)
    // console.log(new Error(status).stack)
    fl_status = status
}

var getLoginInfo = function () {
    change_status('gettingLoginInfo')

    $.post('https://www.freelancer.com/ajax/pinky/header.php', function (data) {
        data = JSON.parse(data)
        if ((!data.userState) || (data.userState != 1)) change_status('disconnected')
        else change_status('logged')
        if ((!!data.data) && (data.data.userJobs)) user_jobs = data.data.userJobs
    })
}

var startSockets = function () {
    console.log('----- Starting Sockets!')
    var h = {hash: '', hash2: '', user_id: '', channels: user_jobs};

    change_status('startingSockets')

    chrome.cookies.getAll({}, function (cookies) {
        for (var i = cookies.length - 1; i >= 0; i--) {
            var cookie = cookies[i]
            if (cookie.name == 'GETAFREE_AUTH_HASH') h.hash = cookie.value
            if (cookie.name == 'GETAFREE_AUTH_HASH_V2') h.hash2 = cookie.value
            if (cookie.name == 'GETAFREE_USER_ID') h.user_id = cookie.value
            if (cookie.name == 'XSRF-TOKEN') cookie_temp = cookie.value
        }
        ;

        if ((!h.hash) || (!h.hash2) || (!h.user_id)) change_status('disconnected')
        else {
            change_status('startingSockets')
        }

        flSock = new SockJS("//notifications.freelancer.com");

        flSock.onmessage = function (d) {
            var e = JSON.parse(d.data);

            if ((e.channel == 'subscribe') && (e.body == 'NO')) {
                change_status('disconnected')
            }
            if ((e.channel == 'subscribe') && (e.body == 'OK')) {
                change_status('running')
            }
            else if (e.channel == 'user') {
                change_status('running')
                var data = e.body.data;
                console.log('data:' + JSON.stringify(data));
                var job_post_timestamp = e.body.timestamp;
                console.log('---job_post_timestamp--- : ' + job_post_timestamp);

                var get_notify_timestamp = Date.now() / 1000;// Math.floor(Date.now() / 1000);
                console.log('---get_notify_timestamp--- : ' + get_notify_timestamp);

                if (e.body.type == 'project') {

                    var url = 'https://www.freelancer.com' + data.linkUrl;

                    // Auto bid filter part
                    var auto_keywords = [
                        "Mobile Phone",
                        "Android",
                        "iPhone",
                        "iPad",
                        "Objective C",
                        "GPS",
                        "Google Maps API",
						"React Native",
                        "Mac",
                        "Swift",
						"Django",
						"Laravel"
                    ];

                    var block_list = [
                        "EnergeticSuccess", "zhandong0217", "SuperDev1128", "AncientLancer", "XCraft21", "langlangFan", "wenjin211",
                        "bailong19891228", "JohnWangDev", "songbing8781", "IT5Einstein", "zhonggehan", "wl5002", "qiyu", "knantshs",
                        "Beautistar", "sergeghawitian", "zanam496", "man060917", "hanming223", "farajmestrah", "perro8", "starlingdimond29", // dangerous,
                        "creativa80", "smithwillam2044", "allenjoe1022", "popololoo", "HugeWave", "janetgray256", "samnield", "zavus",
                        "earthbitcoin", "raheelgrewal", "spectacularnerd", "stevewagner007", "xinfei713", "tiiamutka", "denz25", "Waardan",
                        "ShawnmChoi", "sja124", "ShawnmChoi", "jinthreek89", "msrikannan90", "dexon1", "samkan94", "ccjack2006", "engsarasimo",
                        "opopop123", "qursan", "K3ndrxk", "alhassanomar", "mamdia", "illuder", "mpogorzelski", "Garetisot", "adridder", "ZawWinAung",
                        "Professional Developer", "StevenGowit", "peoplearoundalex", "buldier08", "Jaker9"
                    ];

                    var block_country_list = [
                        "China",
                        "India",
                        "Pakistan",
                        "Nigeria",
                        "Lebanon",
						"Russia",
                        "Sri Lanka",
                        "Bangladesh",
                        "Korea, Republic of",
                        "Ukraine"
                    ];

                    var block_desc_string = [
                        "game", "bitcoin", "unity", "augment", "Cryptocurrency", "vpn", "http://bit.ly/2GaSZWh", "react native", "wechat", "Machine Learning"
                    ];

                    var min_hourly_budget = 15;
                    var min_fixed_budget = 30;
                    var min_fixed_budget_max = 5000;


                    if (new RegExp(auto_keywords.join("|"), 'i').test(data.jobString) && !new RegExp(block_list.join("|"), 'i').test(data.userName) && !new RegExp(block_desc_string.join("|"), 'i').test(data.appended_descr) &&
                        (data.currencyCode == "USD" || data.currencyCode == "EUR" || data.currencyCode == "GBP" || data.currencyCode == "AUD" || data.currencyCode == "CAD")) {

                        console.log('Title: ' + data.title);
                        console.log('UserId: ' + data.userId);
                        console.log('UserName: ' + data.userName);

                        if ((data.projIsHourly && data.minbudget >= min_hourly_budget) || ((!data.projIsHourly && data.minbudget >= min_fixed_budget) && (!data.projIsHourly && data.minbudget <= min_fixed_budget_max))) {

                            var maxbudget = data.maxbudget;
                            if (maxbudget == false)
                                maxbudget = data.minbudget;
                            var b = (data.minbudget * 1 + maxbudget * 1) / 2;
                            var budget = b / 0.9;
                            var period = 30;

                            if (!data.projIsHourly) {
                                if (data.minbudget >= 250 && maxbudget <= 750) {
                                    period = 10;
                                } else if (data.minbudget >= 750 && maxbudget <= 1500) {
                                    period = 20;
                                } else if (data.minbudget >= 1500 && maxbudget <= 3000) {
                                    period = 30;
                                } else if (data.minbudget >= 3000 && maxbudget <= 5000) {
                                    period = 30;//50;
                                } else if (data.minbudget >= 5000) {
                                    period = 30;//data.maxbudget / 100;
                                }
                            } else {
                                period = 40;
                            }

                            if (cookie_temp != '') {
                                $.ajax({
                                        url: 'https://www.freelancer.com/api/users/0.1/users/?users[]=' + data.userId,
                                        type: 'GET',
                                        dataType: 'json',
                                        success: function (result) {
                                            if (result.status == 'success') {
                                                var users = result.result.users;
                                                var users_array = Object.values(users);
                                                var user = users_array[0];
                                                var country = user.location.country.name;
                                                var role = user.role;
                                                if (role == "employer") {
                                                    var index_country = block_country_list.indexOf(country);
                                                    if (index_country == -1) {

                                                        console.log('Placed bid');
                                                        console.log('Country: ' + country + ' Role: ' + role);

                                                        window.open(url+'#placebid')
                                                    } else {
                                                        console.log('Declined');
                                                        console.log('Country: ' + country + ' Role: ' + role);
                                                    }
                                                }
                                            } else {
                                                //alert(result.errors[0]);
                                            }
                                        },
                                        error: function (result) {
                                            alert(result.message);
                                        }
                                    });
                            }
                            //window.open(url+'#placebid')
                        }
                    }

                    // Notification filter part
                    var keywords = [
                        "Mobile Phone",
                        "Android",
                        "iPhone",
                        "iPad",
                        "Objective C",
                        "Java",
                        "GPS",
                        "App Developer",
                        "Google Maps API",
                        "Mac",
                        "Swift"
                    ];

                    if (new RegExp(keywords.join("|")).test(data.jobString) && data.currencyCode != "INR") {

                        var price = '(' + (data.projIsHourly ? 'H: ' : 'F: ') + data.minbudget + data.currency + ' - ' + data.maxbudget + data.currencyCode + ')'

                        var notification = new Notification(price + ' ' + data.title, {
                            icon: data.imgUrl == 'https://www.freelancer.com/img/unknown.png' ? 'unknown.png' : data.imgUrl,
                            body: data.appended_descr
                        })
                        notification.onclick = function () {
                            notification.close()
                            window.open(url + '#placebid')
                        }
                        window.setTimeout(function () {
                            notification.close()
                        }, 10000);
                        // window.open(url+'#placebid')
                    }
                }
                else if (e.body.type == 'private') {
                    if (data.from_user != h.user_id) {
                        var url = 'https://www.freelancer.com'

                        var notification = new Notification("New Message", {
                            icon: "message.png",
                            body: data.message
                        })
                        notification.onclick = function () {
                            notification.close()
                            window.open(url)
                        }
                        window.setTimeout(function () {
                            notification.close()
                        }, 10000);
                    }
                }
            }
        }
        flSock.onopen = function () {
            flSock.send(JSON.stringify({channel: 'auth', body: h}))
        }

        flSock.onclose = function (a) {
            change_status('stop')
            if (!forceStopStatus) {
                //restart()
            }
        }
    })
}


//RUNTIME CODE


//initialize automatically the script at startup

var start = function () {
    fl_status = 'initializing'
    getLoginInfo()
    setInterval(function () {
        if (fl_status != 'gettingLoginInfo') {
            clearInterval()
            if (fl_status == 'logged') {
                startSockets()
            }
        }
    }, 5000)

    setTimeout(function () {
        checkRunning()
    }, 5000)
}

var restart = function () {
    fl_status = 'initializing'
    getLoginInfo()
    setInterval(function () {
        if (fl_status != 'gettingLoginInfo') {
            clearInterval()
            if (fl_status == 'logged') {
                startSockets()
            }
        }
    }, 5000)
}

var checkRunning = function () {
    console.log('check_running')
    setInterval(function () {
        if (fl_status != 'running' && forceStopStatus == false) {
            restart()
        }
    }, 30000)
}

start()

chrome.runtime.onMessage.addListener(function (message, sender, responseCallback) {

    if ((!!message) && (!!message.action)) {

        // GET STATUS
        if (message.action == 'status') {
            if (!!responseCallback) responseCallback(fl_status)
        }

        // LOG IN
        if (message.action == 'login') {
            var user = message.user
            var pass = message.pass
            change_status('logging')
            if (!!responseCallback) responseCallback(fl_status)

            $.post("https://www.freelancer.com/users/ajaxonlogin.php?username=" + user + "&passwd=" + pass + "&savelogin=on", function (data) {
                data = JSON.parse(data)
                if ((!data.status) || (data.status == 'error')) change_status('disconnected')
                else change_status('logged')
            })
        }

        // START
        if (message.action == 'start') {
            forceStopStatus = false
            if ((fl_status != 'stop') && (fl_status != 'uninitialized')) {
                if (!!responseCallback) responseCallback(fl_status)
            }
            else getLoginInfo()
            if (!!responseCallback) responseCallback(fl_status)
        }

        // STOP WEBSOCKET
        if (message.action == 'stop') {
            forceStopStatus = true
            flSock.close()
            change_status('stop')
            if (!!responseCallback) responseCallback('stop')
        }

        // START WEBSOCKETS
        if (message.action == 'listenNotifications') {
            console.log('asdasd')
            startSockets(function () {
                if (!!responseCallback) {
                    console.log('asdasd ' + fl_status)
                    responseCallback(fl_status)
                }
            })
        }

        return true
    }
})

