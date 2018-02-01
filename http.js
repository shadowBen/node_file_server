var PORT = 8080;
var http = require('http');
var url = require('url');
var fs = require('fs');
var mine = require('./mine').types;
var path = require('path');
var livereload = require('livereload'); //livereload
var net = require('net');
var lrserver = livereload.createServer();
var httpProxy = require('http-proxy');
var args = process.argv.splice(2);
var proxy = httpProxy.createProxyServer({
    target: 'http://192.168.20.2:3010/', //接口地址
    changeOrigin: true
    // 下面的设置用于https
    // ssl: {
    // key: fs.readFileSync('server_decrypt.key', 'utf8'),
    // cert: fs.readFileSync('server.crt', 'utf8')
    // },
    // secure: false
});
proxy.on('error', function(err, req, res) {
    try{
        res.writeHead(500, {
        'content-type': 'text/html'
        });
        console.log(err);
        res.end('Something went wrong. And we are reporting a custom error message.');
    }catch(error){
        console.log(error);
    }
    
});
proxy.on('proxyRes', function(req, socket, head) {
    // console.log(proxy.options.target.href);
    // console.log("%o",proxyRes.socket);
    //console.log('Raw Response from the server:',proxy.options.target.href, 'is:', JSON.stringify(proxyRes.headers, true, 2));
});
// proxy.on('open', function(proxySocket) {
//     // listen for messages coming FROM the target here
//     proxySocket.on('data', hybiParseAndLogMessage);
// });
proxy.on('close', function(res, socket, head) {
    // view disconnected websocket connections
    console.log('Client disconnected');
});
var server = http.createServer(function(request, response) {
    var pathname = url.parse(request.url).pathname;
    var index = pathname.indexOf("/", pathname.indexOf("/") + 1);
    var realPath = path.join("www", pathname.substr(0, index), "/src/main/webapp/", pathname.substr(index, pathname.length - 1));
    //console.log(realPath+"====================");
    var ext = path.extname(realPath);
    ext = ext ? ext.slice(1) : 'unknown';
    //判断如果是接口访问，则通过proxy转发
    //console.log(pathname+"------------------");
    //带.do或者固定目录的
    if (pathname.indexOf(".action") > 0) {
        proxy.web(request, response);
        console.log('开启代理');
        console.log(pathname + "------------------");
        return;
    }
    fs.exists(realPath, function(exists) {
        if (!exists) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write("This request URL " + pathname + " was not found on this server.");
            response.end();
        } else {
            if (fs.lstatSync(realPath).isDirectory()) { //判断是不是文件夹
                // path.resolve(realPath);
                response.writeHead(404, {
                    'Content-Type': 'text/plain'
                });
                response.write("This request URL " + pathname + " was a directory on this server. Permission Denied !");
                response.end();
            } else {
                fs.readFile(realPath, "binary", function(err, file) {
                    if (err) {
                        response.writeHead(500, {
                            'Content-Type': 'text/plain'
                        });
                        response.end(err);
                    } else {
                        var contentType = mine[ext] || "text/plain";
                        response.writeHead(200, {
                            'Content-Type': contentType
                        });
                        response.write(file, "binary");
                        response.end();
                    }
                });
            }
        }
    });
});
//ws转发
server.on('upgrade', function(req, socket, head) {
    console.log("websocket转发:"+req.url);
    proxy.ws(req, socket, head);
});

server.portIsOccupied = function(port) {
    // 创建服务并监听该端口
    var _this = this;
    var serverTest = net.createServer().listen(port)
    serverTest.on('listening', function() { // 执行这块代码说明端口未被占用
        serverTest.close() // 关闭服务
        console.log('The port【' + port + '】 is available.') // 控制台输出信息
        server.listen(PORT);
        console.log("Server runing on at port: " + PORT + ".");
    });
    serverTest.on('error', function(err) {
        if (err.code === 'EADDRINUSE') { // 端口已经被使用
            console.log('The port【' + port + '】 is inavailable.') // 控制台输出信息
            PORT++;
            _this.portIsOccupied(PORT);
        }
    });
}

// 检测端口是否被占用
server.portIsOccupied(PORT);

lrserver.watch("./www");
