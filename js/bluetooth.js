/**
 * @Description: 蓝牙打印类  基于h5+ Native.js
 * @Author: EricLee
 * @Date: 2020-10-14 13:53:23
 * @Param: mod
 * @Return: $
 */

var Bluetooth = function () {
// 全局 变量
  let main = null,
    BluetoothAdapter = null,
    UUID = null,
    uuid = null,
    BAdapter = null,
    device = null,
    bluetoothSocket = null,
    outputStream = null,
    OutputStreamWriter = null,
    writer = null

  this.status = 0  // 和设备的连接状态： 0 未连接   1 连接中 2 已连接 （可以打印） 注： ＊* 此状态不是 手机蓝牙和设备的配对状态 **
  // 初始化
  this.initState = function () {
    main = plus.android.runtimeMainActivity()
    BluetoothAdapter = plus.android.importClass('android.bluetooth.BluetoothAdapter')
    BAdapter = BluetoothAdapter.getDefaultAdapter()
    UUID = plus.android.importClass('java.util.UUID')
    uuid = UUID.fromString('00001101-0000-1000-8000-00805F9B34FB')
    this.status = 1
    this.queryBindDevice()
  }
  // 获取配对设备 mac地址
  this.queryBindDevice = function () {
    var lists = BAdapter.getBondedDevices()
    plus.android.importClass(lists)
    // var resultDiv = document.getElementById('bluetooth_list')
    var iterator = lists.iterator()
    plus.android.importClass(iterator)
    console.log('==> 设备列表长度', lists.size())
    if (lists.size() == 0) {
      mui.toast('连接失败！未检测到已配对成功的设备！')
      return
    }
    if (lists.size() > 1) {
      mui.toast('连接失败！检测到多个配对成功设备！')
      return
    }
    while (iterator.hasNext()) {
      var d = iterator.next()
      plus.android.importClass(d)
      console.log(d.getAddress())
      console.log(d.getName())
      this.createConnect(d.getAddress()) // 创建连接
    }
  }
  // 建立连接
  this.createConnect = function (mac) {
    if (!mac) {
      mui.toast('连接失败！未能获取设备MAC地址！')
      this.status = 0
      return
    }
    device = BAdapter.getRemoteDevice(mac) // 连接打印机
    plus.android.importClass(device)
    // 只需建立一次连接，多次调用不能正常打印 ！！！
    bluetoothSocket = device.createInsecureRfcommSocketToServiceRecord(uuid)
    plus.android.importClass(bluetoothSocket)

    if (!bluetoothSocket.isConnected()) {
      console.log('断开了，需要重新连接,连接中')
      bluetoothSocket.connect()
    }
    mui.toast('打印机已准备就绪，可以打印！')
    this.status = 2
    // 注册打印类
    outputStream = bluetoothSocket.getOutputStream()
    plus.android.importClass(outputStream)
    OutputStreamWriter = plus.android.importClass('java.io.OutputStreamWriter')
    writer = new OutputStreamWriter(outputStream, 'GBK')
    plus.android.importClass(writer)
  }
  // 关闭IO 关闭连接
  // 关闭页面时必需调用该方法，要不下次不能正常连接设备 !!!
  this.closeConnect = function () {
    bluetoothSocket.close()
    outputStream.close()
    OutputStreamWriter.close()
    bluetoothSocket = null
    outputStream = null
    OutputStreamWriter = null
    device = null
    this.status = 0
  }
  // 走纸 n = 点行数
  this.feedPoint = function (n) {
    const point = n || 8
    writer.write(0x1B)
    writer.write(0x4A)
    writer.write(point) // 点行 8 点 = 1mm
    writer.flush()
  }
  // 走纸 n = 行数
  this.feedLine = function (n) {
    const line = n || 1
    writer.write(0x1B)
    writer.write(0x64)
    writer.write(line) // 行数
    writer.flush()
  }
  //  设置左边距
  this.setLeftMargin = function (n, m) {
    writer.write(0x1D)
    writer.write(0x4C)
    writer.write(n) // 行数
    writer.write(m) // 行数
    writer.flush()
  }
  // 打印空行 linNum 行数
  this.printLine = function (lineNum) {
    for (let i = 0; i < lineNum; i++) {
      writer.write('\n')
    }
    writer.flush()
  }
  // 设置打印 位置 // 0 右 1 中 2 右
  this.setPrintPosition = function (n) {
    let m = n || 1
    writer.write(0x1B)
    writer.write(0x61)
    writer.write(m) // 0 右 1 中 2 右
    writer.flush()
  }
  // 设置绝对打印位置
  this.setPrintLocation = function (light, weight) {
    writer.write(0x1B)
    writer.write(0x24)
    writer.write(light)  // 0≤ light ≤ 255
    writer.write(weight)  // 0≤ weight ≤ 2
    writer.flush()
  }
  // 打印空白(一个Tab的位置，约4个汉字)
  this.printTabSpace = function (n) {
    for (let i = 0; i < n; i++) {
      writer.write('\t')
    }
    writer.flush()
  }
  // 设置/解除字符旋转模式
  // 0解除旋转模式       1设置90°顺时针旋转模式         2设置180°顺时针旋转模式        3设置270°顺时针旋转模式
  this.setPrintRotate = function (n) {
    writer.write(0x1B)
    writer.write(0x56)
    writer.write(n)
    writer.flush()
  }
  // 打印位图  todo
  this.printBitmap = function (m, data) {
    writer.write(0x1B)
    writer.write(0x2A)
    writer.write(m)
    writer.write(data)
  }
  // 字符缩放
  this.setCharacterScale = function (n) {
    // 打印倍宽高
    if (n == 1) {
      writer.write(0x1B)
      writer.write(0x21)
      writer.write(16)
      writer.flush()

      writer.write(0x1B)
      writer.write(0x21)
      writer.write(32)
      writer.flush()
    } else {
      writer.write(0x1B)
      writer.write(0x21)
      writer.write(0)
      writer.flush()
    }
  }
  // 打印初始化 每次打印前必须调用！！！
  this.initPrinter = function () {
    writer.write(0x1B)
    writer.write(0x40)
    writer.flush()
  }
  //  打印文字 并换行
  this.printTextNewLine = function (byteStr) {
    if (!main) {
      mui.toast('设备未进行配对！')
      return
    }
    var bytes = plus.android.invoke(byteStr, 'getBytes', 'gbk')
    console.log(bytes)

    outputStream.write(bytes)
    outputStream.flush()

    // 换行
    writer.write('\n')
    writer.flush()
    console.log('print ')
  }
  // 打印字符串方法 byteStr 只能是字符串
  this.printText = function (byteStr, l, w) {
    if (!main) {
      mui.toast('设备未进行配对！')
      return
    }
    var bytes = plus.android.invoke(byteStr, 'getBytes', 'gbk')
    console.log(bytes)

    outputStream.write(bytes)
    outputStream.flush()
    console.log('print ')
    // device = null
  }
  /**
   * @Description: 二维码打印
   * @Author: EricLee
   * @Date: 2020-10-15 15:16:10
   * @Param: byteStr {String} 要打印的内容
   * @Return: void
   */
  this.printQrcode = function (byteStr) {
    if (!main) {
      mui.toast('设备未进行配对！')
      return
    }
    // init
    var moduleSize = 8
    var bytes = plus.android.invoke(byteStr, 'getBytes', 'gbk')
    var length = bytes.length

    console.log(length)
    // 缓存二维码数据
    writer.write(0x1D)// init
    writer.write('(k')// adjust height of barcode
    writer.write(length + 3) // pl
    writer.write(0) // ph
    writer.write(49) // cn
    writer.write(80) // fn
    writer.write(48) //
    writer.write(byteStr)
    // 二维码纠错等级
    writer.write(0x1D)
    writer.write('(k')
    writer.write(3)
    writer.write(0)
    writer.write(49)
    writer.write(69)
    writer.write(48)
    // 设置二维码块大小
    writer.write(0x1D)
    writer.write('(k')
    writer.write(3)
    writer.write(0)
    writer.write(49)
    writer.write(67)
    writer.write(moduleSize)
    // 打印已缓存的数据二维码
    writer.write(0x1D)
    writer.write('(k')
    writer.write(3) // pl
    writer.write(0) // ph
    writer.write(49) // cn
    writer.write(81) // fn
    writer.write(48) // m

    writer.flush()
    // 二维码打印 结束

    console.log('print Qrcode')
  }
}
