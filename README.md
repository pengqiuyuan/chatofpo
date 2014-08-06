chatofpomelo ie7、8、9 有bug,客户端没10秒会执行一次disconnect，未解决

1、chatofpo\game-server\node_modules\pomelo\lib\connector\sioconnector.js
   替换下sioconnector.js这个文件
2、修改了4个地方

![Image text](https://cloud.githubusercontent.com/assets/4953205/3824900/dd97f01c-1d4d-11e4-943f-d13aebcf8678.png)
