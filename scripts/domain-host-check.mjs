import http from 'node:http';
async function request(path,host,method='GET',protocol='https') {
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'localhost',port:5215,path,method,headers:{host,'x-forwarded-proto':protocol}},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{
        const body=Buffer.concat(chunks).toString('utf8'),headers=new Headers();
        for(const [key,value] of Object.entries(res.headers))for(const part of Array.isArray(value)?value:[value])if(part!==undefined)headers.append(key,part);
        resolve({status:res.statusCode,headers,text:async()=>body,json:async()=>JSON.parse(body)});
      });
    });req.on('error',reject);req.end();
  });
}
function check(name,ok){if(!ok)throw new Error(`FAIL ${name}`);console.log(`ok ${name}`);}
async function main(){
const site='unilagtaekwondo.org',portal='portal.unilagtaekwondo.org';
const insecure=await request('/login',portal,'GET','http');check('HTTP portal requests redirect to HTTPS',insecure.status===307&&insecure.headers.get('location')==='https://portal.unilagtaekwondo.org/login');
for(const [path,host,expected] of [
 ['/',portal,'https://portal.unilagtaekwondo.org/dashboard'],
 ['/login',site,'https://portal.unilagtaekwondo.org/login'],
 ['/register',site,'https://portal.unilagtaekwondo.org/register'],
 ['/setup-account?token=example-token',site,'https://portal.unilagtaekwondo.org/setup-account?token=example-token'],
 ['/dashboard/coach?tab=attendance',site,'https://portal.unilagtaekwondo.org/dashboard/coach?tab=attendance'],
 ['/examiner/example-token',site,'https://portal.unilagtaekwondo.org/examiner/example-token'],
 ['/api/auth/session',site,'https://portal.unilagtaekwondo.org/api/auth/session'],
 ['/privacy?source=portal',portal,'https://unilagtaekwondo.org/privacy?source=portal'],
]){const r=await request(path,host);check(`${host}${path} redirects correctly`,r.status===307&&r.headers.get('location')===expected);}
let r=await request('/dashboard/coach',portal);check('portal dashboard requires login',r.status===307&&r.headers.get('location')?.startsWith('https://portal.unilagtaekwondo.org/login?'));
r=await request('/login',portal);check('portal login renders without redirect loop',r.status===200);
r=await request('/privacy',site);const html=await r.text();check('public website renders on main domain',r.status===200);check('public portal and registration links use portal domain',html.includes('https://portal.unilagtaekwondo.org/dashboard')&&html.includes('https://portal.unilagtaekwondo.org/register'));
r=await request('/api/auth/session',portal);check('portal auth session endpoint works',r.status===200&&(await r.json())===null);
r=await request('/api/auth/csrf',portal);const cookies=r.headers.getSetCookie();check('auth cookies remain secure and host-only',r.status===200&&cookies.length>0&&cookies.every(cookie=>!/(?:^|;)\s*domain=/i.test(cookie)&&/;\s*secure/i.test(cookie)));
r=await request('/icon.png',portal);check('portal static assets remain accessible',r.status===200&&!r.headers.get('location'));
r=await request('/register',site,'POST');check('wrong-domain portal submissions are rejected',r.status===421);
r=await request('/privacy',portal,'POST');check('wrong-domain public submissions are rejected',r.status===421);
console.log('DOMAIN HTTP CHECKS PASSED (no accounts or DNS modified)');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>http.globalAgent.destroy());
