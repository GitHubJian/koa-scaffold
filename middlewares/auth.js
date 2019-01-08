const fetch = require('node-fetch');

const signature = require('../utils/signature');

const cookieUserIDKey = 'muid';
const cookieMisIDKey = 'msid';
const cookieUserName = 'muname';
const cookieRolesIDKey = 'rolesid';
let cookieTokenKey = 'ssoid'; // 处理中改成ssoAppkey + ssoid
let cookieRefreshTokenKey = 'ssorid'; // 处理中改成ssoAppkey + ssorid

let ssoHost;
let ssoApiHost;
let ssoAppkey;
let ssoSecret;
let upmHost;

module.exports = function(config) {
    const {
        ssoHost: ssoDomain,
        ssoApiHost: ssoApiDomain,
        ssoAppkey: ssoClientId,
        ssoSecret: ssoSc,
        upmHost: upmDomain,
        upmPrefix,
        enableAuth,
        urlPrefix,
    } = config;

    // TODO 这样处理不够优雅
    ssoHost = ssoDomain;
    ssoApiHost = ssoApiDomain;
    ssoAppkey = ssoClientId;
    ssoSecret = ssoSc;
    upmHost = upmDomain;
    cookieTokenKey = ssoAppkey + '_ssoid';
    cookieRefreshTokenKey = ssoAppkey + '_ssorid';

    return async (ctx, next) => {
        let checkUrl = ctx.path;
        if (checkUrl.indexOf(urlPrefix) === 0) {
            checkUrl = checkUrl.replace(urlPrefix, '');
        }

        // skip sso
        if (ctx.skipSSO) {
            return await next();
        }
        // alive check
        if (checkUrl === '/api/alive') {
            return await next();
        }
        // login*logout
        if (checkUrl === ('/auth/login')) {
            return await login.call(ctx);
        }
        if (checkUrl === ('/auth/logout')) {
            return await logout.call(ctx);
        }
        if (checkUrl === ('/auth/callback')) {
            return await callback.call(ctx);
        }

        // 静态资源
        if (checkUrl.startsWith('/static/')) {
            return await next();
        }

        const token = getToken.call(ctx);
        let userData;
        
        if (token) {
            userData = await getUserInfo.call(ctx, token);
        }
        // 如果没有token或者token验证不通过则重新登录
        if (!token) {
            return setLoginMessage.call(ctx, 'login', '已退出登录，请重新登录');
        }
        if (!userData) {
            setAuthInfo.call(ctx);
            return setLoginMessage.call(ctx, 'logout', '登录过期，请重新登录');
        }
        // cookie存的跟验证的不一致
        if (ctx.cookies.get(cookieMisIDKey) !== userData.login) {
            setUserInfo.call(ctx, userData);
            return setLoginMessage.call(ctx, 'login', '登录信息有误，请刷新页面');
        }
        ctx.auth = userData || {};

        const userId = ctx.auth.id;

        // url鉴权
        if (enableAuth & 0b1) {
            ctx.upmPrefix = upmPrefix || '';
            ctx.urlPrefix = urlPrefix || '';
            const permission = await checkPermission.call(
                ctx,
                userId,
                ctx.path.replace(ctx.urlPrefix, '')
            );

            if (permission === false) {
                ctx.status = 403;

                if (ctx.request.accepts('json')) {
                    ctx.body = {
                        code: 9,
                        msg: '没有权限',
                        data: null
                    };
                } else {
                    ctx.body = '没有权限';
                }

                return;
            }
        }

        // bind auth
        ctx.auth = Object.assign(ctx.auth, {
            checkPermission: checkPermission.bind(ctx),
            getInfo: getInfo.bind(ctx),
            getToken: getToken.bind(ctx),
            getMisId: getMisId.bind(ctx),
            getUserId: getUserId.bind(ctx),
            getUserName: getUserName.bind(ctx),
            isRole: isRole.bind(ctx),
            getRoleIds: getRoleIds.bind(ctx),
        });

        await next();
    };
};


// api -----------------------------------------------------------------------------------------------
async function login() {
    let callbackUri = this.query.callback || encodeURIComponent('/');
    let redirect_uri = encodeURIComponent(`${this.origin}/auth/callback?callback=${callbackUri}`);
    return this.redirect(`${ssoHost}/oauth2.0/authorize?redirect_uri=${redirect_uri}&client_id=${ssoAppkey}`);
}
async function callback() {
    let code = this.query.code;
    let tokenUrl = `${ssoApiHost}/oauth2.0/accessToken?grant_type=code&client_id=${ssoAppkey}&client_secret=${ssoSecret}&code=${code}`;

    let callbackUri = decodeURIComponent(this.query.callback || '/');

    try {
        let res = await fetch(tokenUrl);
        let authData = await res.json();
        setAuthInfo.call(this, authData);
        let userInfo = await getUserInfo.call(this, authData.access_token);
        if(!userInfo){
            throw '登录失败';
        }
        setUserInfo.call(this, userInfo);

        await upmRoles.call(this, userInfo.id).catch(e => {
            console.error('[deprecated]upmrole获取失败', e);
        });
        this.redirect(callbackUri);
    } catch (e) {
        console.error('/auth/callback error', e);
        this.status = 401;
        this.body = `登录失败，请稍后再试（${e}）`;
    }
}
async function logout() {
    let callbackUri = this.query.callback || encodeURIComponent('/');
    let redirect_uri = encodeURIComponent(`${this.origin}/auth/callback?callback=${callbackUri}`);
    setAuthInfo.call(this, {
        access_token: '',
        expires: 0,
        refresh_expires: 0,
        refresh_token: '',
    });
    this.redirect(`${ssoHost}/oauth2.0/logout?redirect_uri=${redirect_uri}&client_id=${ssoAppkey}`);
}

// func -----------------------------------------------------------------------------------------------
function setLoginMessage(type, msg){
    if(!this.accepts('html')){
        this.status = 401;
        return this.body = {
            code: 5,
            data: null,
            msg: msg,
        };
    }
    else{
        return this.redirect(`${this.origin}/auth/${type}?callback=${encodeURIComponent(this.url)}`);
    }
}
function getInfo() {
    return {
        token: getToken.call(this),
        misId: this.auth.login,
        userId: this.auth.id,
        userName: this.auth.name,
        roleIds: getRoleIds.call(this)
    };
}
function setUserInfo(userInfo){
    this.cookies.set(cookieMisIDKey, userInfo.login, {httpOnly: false});
    // TODO 后面两个后续会去除
    this.cookies.set(cookieUserIDKey, userInfo.id);
    this.cookies.set(cookieUserName, encodeURIComponent(userInfo.name));
}
function getToken() {
    // 兼容ssoid
    return this.cookies.get(cookieTokenKey) || this.cookies.get('ssoid');
}
function getMisId() {
    return this.auth.login;
}
function getUserId() {
    return this.auth.id;
}
function getUserName() {
    // let userName = new Buffer(this.cookies.get(cookieUserName) || '', 'base64').toString();
    return this.auth.name;
}
function isRole(roleId) {
    return ~(getRoleIds.call(this).indexOf(roleId));
}
function getRoleIds() {
    let roles = this.cookies.get(cookieRolesIDKey);
    return roles ? roles.split(',') : [];
}

// TODO 后续去掉，部分系统在用
async function upmRoles(userId) {
    // 调取upm接口，获取用户全部角色信息
    let resRoles = await fetch(`${upmHost}/api/roles/${userId}/${ssoAppkey}`, {
        headers: signature({
            clientId: ssoAppkey,
            clientSecret: ssoSecret,
            uri: `/api/roles/${userId}/${ssoAppkey}`,
            method: 'GET'
        })
    });
    let rolesIds = '';
    let rolesData = await resRoles.json();
    rolesData.data &&
        rolesData.data.forEach(function(role, index) {
            rolesIds += role.roleId;
            if (index != rolesData.data.length - 1) {
                rolesIds += ',';
            }
        });
    this.cookies.set(cookieRolesIDKey, rolesIds, {httpOnly: false});
}

async function checkPermission(userId, url) {
    // let res = yield fetch(`${upmHost}/api/resourceGroup/getResourcesByUrlPrefix`);
    url = this.upmPrefix + this.urlPrefix + url;
    let authApi = '/api/resourceGroup/authList';
    let headers = signature({
        clientId: ssoAppkey,
        clientSecret: ssoSecret,
        uri: authApi,
        method: 'POST'
    });
    headers['Content-Type'] = 'application/json';
    let res = await fetch(`${upmHost}${authApi}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            appkey: ssoAppkey,
            userId: userId,
            resources: [url]
        })
    });

    if (res.status === 401) {
        return this.redirect(`${this.origin}/auth/logout`);
    } else {
        let result = await res.json();
        return !!result.data[0].status;
    }
}


function setAuthInfo({access_token = '', expires = 0, refresh_expires = 0, refresh_token = ''} = {}){
    this.cookies.set(cookieTokenKey, access_token, {
        // maxAge: (+expires || 0) * 1000,
        maxAge: expires ? null : 0,
    });
    // this.cookies.set(cookieRefreshTokenKey, refresh_token, {
    //     maxAge: (+refresh_expires || 0) * 1000,
    // });

    // 兼容旧逻辑
    this.cookies.set('ssoid', access_token, {
        // maxAge: (+expires || 0) * 1000,
        maxAge: expires ? null : 0,
    });
}

async function getUserInfo(token){
    let headers = signature({
        clientId: ssoAppkey,
        clientSecret: ssoSecret,
        uri: this.path,
        method: 'GET'
    });
    let res = await fetch(`${ssoApiHost}/oauth2.0/userinfo?access_token=${token}`, {
        headers: headers
    });
    let userData = await res.json();

    if(userData.code === 200 && userData.attributes.id){
        return userData.attributes;
    }
    else{
        this.status = 401;
    }
}


