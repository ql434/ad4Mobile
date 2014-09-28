/**
 *	@fileOverview	手搜广告
 */
(function() {

	/**
	 *	@desp	全局常量配置,可以通过passion.config初始化配置
	 */
	var g_conf = {
		cookie_id_prefix : "beans_",
		max_turn : 60,
		default_timeout : 3000,
		url_adserver : "http://s.go.sohu.com/adgtr/",
		url_pv : ["http://i.go.sohu.com/count/v"],
		url_click : ["http://i.go.sohu.com/count/c"],
		dict_report : {
			adid : "aid", //广告ID
			cont_id : "apid", //广告位ID
			impression_id : "impid", //ImpressionID
			adtype : "at", //广告类型，1表示广告，2表示内容，3表示Network，4表示博客广告,0表示打底
			monitorkey : "mkey", //monitorKey
			latency : "latcy", //广告延迟时间
			freq : "freq", //频次
			turn : "turn", //轮换数
			data_id : "ipos", //广告在一次返回中位置，从0开始，例如淘宝客返回3个广告则左边广告位0，中部为1，右边为2
			pgid : "pgid", //pvid
			x : "ax", //广告位置横坐标
			y : "ay", //广告位置纵坐标
			cx : "cx", //广告点击位置横坐标
			cy : "cy", //广告点击位置纵坐标
			ctlk : "ctlk", //内容推荐link
			ctrlt : "ctrlt", //流量控制类型，0表示不控制，1表示展示量控制，2表示点击量控制，3表示补量控制
			ctrln : "ctrln", //流量控制量
			c : "c", //计价信息
			e : "e", //计价信息
			ed : "ed", //计价信息
			supplyid : "supplyid", //
			ext : "ext", //扩展信息
			bucket : "bucket" //日志来源
		}
	};

	/**
	 *	@desp	基础功能对象
	 */
	var $ = {

		get_jsonp : function(obj) {

			var url = obj.url, complete = obj["complete"], success = obj["success"], error = obj["error"], self = this;

			var callback = "sohu_moblie_callback" + (Math.random() + '').substr(2, 16);

			window[callback] = function(data) {
				if ( typeof success === "function") {
					success(data);
				}

				if ( typeof complete === "function") {
					complete(data);
				}

				window.clearTimeout(obj.timeout);
				window[callback] = undefined;
			};

			if (url.indexOf('?') === -1)
				url += '?';
			else
				url += '&';
			url += ("callback=" + callback);

			for (var pro in obj.data) {
				url += ('&' + pro + '=' + obj.data[pro]);
			}

			self.get_script(url);

			if (obj.timeout) {
				obj.timeout = window.setTimeout(function() {

					if ( typeof window[callback] === "function") {
						window[callback] = undefined;
					}

					if ( typeof error === "function") {
						error();
					}

					if ( typeof complete === "function") {
						complete();
					}

				}, obj.timeout);
			}
		},

		get_script : function(src) {

			var script = document.createElement('script'), head = document.getElementsByTagName('head')[0];

			script.src = src;

			script.onload = script.onreadystatechange = function() {
				if (!script.readyState || /loaded|complete/.test(script.readyState)) {
					script.onload = script.onreadystatechange = null;
					head.removeChild(script);
				}
			};

			head.appendChild(script);
		},

		extend : function() {

			var obj = {};
			for (var i = 0; i < arguments.length; i++) {
				for (var prop in arguments[i]) {
					if (prop !== "constructor") {
						obj[prop] = arguments[i][prop];
					}
				}
			}

			return obj;
		},

		cookie : function(name, value, hours) {
			if (!value) {
				var arr = document.cookie.match(new RegExp('(^| )' + name + '=([^;]*)(;|$)'));
				return arr && arr[2];
			}
			document.cookie = name + '=' + escape(value) + ";expires=" + new Date((new Date()).getTime() + hours * 60 * 60 * 1000).toGMTString();
		},

		each : function(obj, iterator, context) {
			if (obj == null)
				return;
			if (obj.length === +obj.length) {
				for (var i = 0, l = obj.length; i < l; i++) {
					iterator.call(context, i, obj[i], obj);
				}
			} else {
				for (var key in obj) {
					if (_.has(obj, key)) {
						iterator.call(context, key, obj[key], obj);
					}
				}
			}
		},

		using : function(obj, namespace, def_val) {

			if ( typeof (obj) === "string") {
				def_val = namespace;
				namespace = obj;
				obj = window;
			}
			var nps = namespace.split(".");
			this.each(nps, function(i) {
				obj[nps[i]] = obj[nps[i]] || ((i === (nps.length - 1)) ? (def_val || {}) : {});
				obj = obj[nps[i]];
			});

			return obj;
		},
		getCookie : function(objName) {//获取指定名称的cookie的值,
			var arrStr = document.cookie.split('; ');
			for (var i = 0; i < arrStr.length; i++) {
				var temp = arrStr[i].split('=');
				if (temp[0] == objName)
					return unescape(temp[1]);
			}
			return "";
		}
	};

	/**
	 *	@desp	passion_mobile
	 */
	var passion = ( {
		init : function() {
			this.config(window["passion_config"]);
			return this;
		},

		ones : function(beans) {
			beans = this.inst(beans);
			if (beans)
				this.load(beans);

		},

		config : function(options) {

			if (options) {
				g_conf = $.extend(g_conf, options);
			}
		},

		inst : function(beans) {
			//初始化数组形式的参数
			if (beans && beans.length) {

				for (var i = 0, j = beans.length; i < j; i++) {
					var bean = beans[i];
					bean.cont_id = "beans_" + bean.itemspaceid;
					bean.status = 0;
					bean = this.format(bean);
					beans[i] = bean;
				}

				return beans;
			}
			return false;
		},

		format : function(bean) {

			for (var pro in bean) {
				if (/resource$|resource([0-9])$/.test(pro)) {
					if (bean[pro].imp) {
						//兼容后端无法提供合法的json格式返回数组
						try {
							var _imp = eval(bean[pro].imp);
							if (_imp)
								bean[pro].imp = _imp;
						} catch(ex) {
						}

						if ( typeof (bean[pro].imp) === "string") {
							bean[pro].imp = bean[pro].imp.split("|");
						}

						for (var i = 0; i < bean[pro].imp.length; i++) {
							bean[pro].imp[i] = bean[pro].imp[i].replace(/\${TS}/g, (new Date().getTime())).replace(/@local@/g, window.location.href).replace(/\${SLOTID}/g, bean.itemspaceid + '&' + 'mk=' + bean.monitorkey);

							// ad_plus 上报 都增加 广告位ID和impression_id
							if (bean[pro].imp[i].indexOf("imp.optaim.com") > -1) {
								bean[pro].imp[i] += '&apid=' + bean.cont_id + (bean.impression_id ? ('&impid=' + bean.impression_id) : "");
							}

						}
					}

					if (bean[pro].click) {
						bean[pro].click = bean[pro].click.replace(/\${TS}/g, (new Date().getTime())).replace(/@local@/g, window.location.href).replace(/\${SLOTID}/g, bean.itemspaceid + '&' + 'mk=' + bean.monitorkey);
					}
				}
			}
			return bean;
		},

		load : function(beans) {

			for (var i = 0, j = beans.length; i < j; i++) {
				var bean = beans[i];
				if (bean.resource) {
					this.paint(bean);
					this.attach(bean);
				} else {
					bean.monitorkey = undefined;
					this.report("pv", bean);

				}

			}
		},

		special : function(bean) {

			var cont = document.getElementById(bean.cont_id);
			if (!cont)
				return;
			var spec = $.using(bean, "special.dict");

			if (bean.form === "picturetxt") {
				var res = bean[spec.picture || "resource"];
				var res2 = bean[spec.txt || "resource1"];

				if (res && res2) {
					cont.innerHTML = "<a href=\"" + res.click + "\" target=\"_blank\">" + "<img src=\"" + res.file + "\" border=\"0\"" + " style=\"max-width:100%; max-height:auto;\"" + "/></a>" + "<div class=\"topic-title\"><p>" + res2.text + "</p></div>";
					bean.status = 1;
					this.report(res.imp);
					this.report(res2.imp);
					this.report("pv", bean);
				}
			}

		},

		paint : function(bean) {

			if (!bean)
				return;
			var res = bean.resource, cont = document.getElementById(bean.cont_id);
			if (!res || !cont)
				return;

			var form = bean.form;
			if (form) {
				this.special(bean);
			} else {
				switch (res.type) {

					case "text":
						cont.innerHTML = '<a href="' + res.click + '" target="_blank">' + res.text + '</a>';
						bean.status = 1;
						break;
					case "image":
						cont.innerHTML = "<a href=\"" + res.click + "\" target=\"_blank\">" + "<img src=\"" + res.file + "\" border=\"0\"" + " style=\"max-width:100%; max-height:auto;\"" + "/></a>";
						bean.status = 1;
						break;
					case "iframe":
						cont.innerHTML = "<iframe style=\"max-width:100%; max-height:auto;\" frameborder=\"0\" marginwidth=\"0\" marginheight=\"0\" scrolling=\"no\" src=\"" + res.file + "\"></iframe>";
						bean.status = 1;
						break;
				}

				if (bean.status === 1) {

					//②广告成功加载上报adserver&&adplus
					this.report(res.imp);
					this.report("pv", bean);
				}
			}

		},

		attach : function(bean) {

			var self = this;

			if (bean.status) {
				var cont = document.getElementById(bean.cont_id);
				cont.style.display = "block";
				cont.addEventListener("mousedown", function() {
					self.report("click", bean);
					self.report(bean.clkm);
				}, false);
			}
		},

		report : function(pro, obj) {

			if (!pro)
				return;
			var urls = typeof (pro) === "string" ? g_conf["url_" + pro] || new Array(pro) : pro, args = "", dict = g_conf.dict_report;

			if (obj) {

				for (pro in dict) {
					if (obj[pro]) {
						args += (args && '&') + (dict[pro] + '=' + obj[pro]);
					}
				}

			}
			if($.getCookie("_smuid")){
				args+="&_smuid="+$.getCookie("_smuid");
			}
			for (var i = 0; i < urls.length; i++) {

				var u = urls[i];

				if (u.indexOf("http") === -1)
					continue;

				if (args)
					u += (u.indexOf("?") === -1 ? "?" : "&") + args;
				var img = new Image();
				img.src = u;
			}
		},

		get_turn : function(max_turn) {

			if (!this.turn) {

				var cookie_name = g_conf.cookie_id_prefix + 'turn';
				var turn = parseInt(($.cookie(cookie_name) || parseInt(Math.random() * g_conf.max_turn + 1, 10)), 10);

				this.turn = turn;

				var new_turn = turn + 1;
				if (new_turn > g_conf.max_turn)
					new_turn = 1;

				$.cookie(cookie_name, new_turn, {
					"path" : '/',
					"expires" : 1
				});
			}

			if (max_turn)
				return (this.turn - 1) % max_turn + 1;
			else
				return this.turn;

		}
	}).init();

	var data_request = function(param, callback) {

		this.param = param;
		this.callback = callback;
		this.data = [];
	};
	data_request.prototype = {

		//获取广告数据入口，数据依次判断页面CPD数据及服务器数据
		//如果去到CPD数据则加载CPD广告，否则继续读取服务器端数据
		//若服务器端返回数据则加载精准广告，如无数据最终加载打底
		//广告，iframe形式
		get : function() {

			var param = this.param;
			if (param.itemspaceid) {
				var new_param = {};
				new_param[param.itemspaceid] = param;
				param = this.param = new_param;
			}

			for (var pro in param) {

				var adsrc = param[pro].adsrc, has_cpd_data;
				param[pro].itemspaceid = pro;

				if (adsrc >= 200) {
					has_cpd_data = this.get_from_cpds(param[pro]);
				}

				if (adsrc > 200) {
					if (!has_cpd_data) {
						param[pro].adsrc = adsrc - 200;
						this.get_from_ads(param[pro]);
					}
				}

				if (adsrc < 200) {
					this.get_from_ads(param[pro]);
				}
			}

			this.check_complete();

		},

		get_from_cpds : function(param) {

			if (!param.itemspaceid)
				return;

			var cur_turn = 1, cpd_data = null, data = this.data, pro = param["itemspaceid"], isloc = false, ad_data = window["AD_DATA"] || {};

			if (/^\d{4,8}$/.test(pro)) {

				param.status = 0;

				if (!param["turn"]) {
					param["turn"] = passion.get_turn(param["max_turn"]);
				}
				cur_turn = param["turn"] - 1;

				cpd_data = ad_data[pro] && ad_data[pro][cur_turn] && ad_data[pro][cur_turn]["data"] || {};

				isloc = ad_data[pro] && ad_data[pro][cur_turn] && ad_data[pro][cur_turn]["isloc"];

				cpd_data = (isloc && (CONFIG.IP || CONFIG.SOIP)) ? (cpd_data[CONFIG.IP] || cpd_data[CONFIG.SOIP.substr(0, 6)] || cpd_data[CONFIG.SOIP.substr(0, 4)] || cpd_data["DEFAULT"]) : cpd_data["DEFAULT"];

				if (cpd_data) {

					data.push($.extend({}, param, cpd_data));
					return true;
				}
			}

		},

		get_from_ads : function(param) {

			var self = this;

			if (!param) {
				param = this.param;
			}

			var query = param.query || {};

			if (!param.itemspaceid)
				return;
			query.itemspaceid = param.itemspaceid;

			param.status = -1;

			if (!param.adps) {
				if (!param.width || !param.height)
					return;
				var a = (param.height + "").length;
				param.adps = query.adps = param.width + (1 << (a >= 4 ? 0 : 4 - a)).toString(2).substr(1) + param.height;
			} else {
				param.width = parseInt(param.adps.substr(0, param.adps.length - 4), 10);
				param.height = parseInt(param.adps.substr(param.adps.length - 4), 10);
			}

			//			if ("apt" in param)
			//				query.apt = param["apt"];
			if (!query.adps)
				query.adps = param["adps"];
			if (!query.adsrc)
				query.adsrc = param["adsrc"];
			if (!query.turn)
				query.turn = param["turn"] || passion.get_turn(param["max_turn"]);

			query.apt = param.supplyid = 4;
			/**
			 * @important	start time by ad load
			 * 广告的加载起始时间，从请求广告数据开始，如请求
			 * 多条广告信息，则最终计算出的单挑广告加载时间中
			 * 包括多条广告数据请求时间
			 */
			param.start_time = (new Date()).getTime();
			this.param[param.itemspaceid] = param;

			$.get_jsonp({
				url : g_conf.url_adserver,
				timeout : g_conf.default_timeout,
				data : query,
				complete : function() {
					self.complete(param);
				},
				success : function(data) {
					self.success(data, param);
				}
			});

		},

		complete : function(bean) {

			this.param[bean.itemspaceid].status = 0;
			this.check_complete();

		},

		success : function(data, bean) {

			if (data && data.length) {
				data[0].by_server = '1';
				data[0].end_time = (new Date()).getTime();
				this.data.push($.extend({}, bean, data[0]));
			} else {
				this.data.push(bean);
			}

			this.check_complete();
		},

		check_complete : function() {

			var param = this.param, data = this.data;

			for (var pro in param) {

				if (param[pro].status === -1)
					return;

			}

			this.callback.call(this, data);
		}
	};

	window.passion = {

		ones : function(p) {

			var type = Object.prototype.toString.call(p);
			if (type === "[object Array]") {
				passion.ones(p);
			} else if (type === "[object Object]") {
				var dr = new data_request(p, function(data) {
					passion.ones(data);
				});
				dr.get();
			}
		},

		config : function(obj) {
			return passion.config(obj);
		}
	};
})();
