using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using System;
using System.Text;
using Easy;
using System.Reflection;
using System.Threading.Tasks;

public class NetMgr : Singleton<NetMgr>
{
    public string host = "127.0.0.1";

    public int port = 3001;

    public Action connectCallback;

    public int msgSequenceId;

    public Dictionary<string, Type> protocols = new Dictionary<string, Type>();

    public Dictionary<long, Action<BaseMsg>> msgCallbacks = new Dictionary<long, Action<BaseMsg>>();

    public Dictionary<string, IPushProtocolHandler> msgHandlers = new Dictionary<string, IPushProtocolHandler>();



    public override void Init(InitCompleteCallback complete)
    {

    }

    public override void BeforeRestart()
    {

    }

    public async EasyEmptyTask Start()
    {
        //查找全部数据类
        List<Type> types = EasyFrameworkMain.Instance.GetTypes();
        var BaseMsgType = typeof(BaseMsg);
        var IProtocolHandlerType = typeof(IPushProtocolHandler);
        foreach (var t in types)
        {
            if (BaseMsgType.IsAssignableFrom(t) && t != BaseMsgType)
            {
                var fieldInfo = t.GetField("protocol");
                if (fieldInfo == null)
                {
                    continue;
                }
                var protocol = fieldInfo.GetValue(null).ToString();
                if (string.IsNullOrEmpty(protocol))
                {
                    continue;
                }
                EasyLogger.Log(()=>"protocol", ()=>"----" + protocol);
                protocols.Add(protocol, t);
            }

            if (BaseMsgType.IsAssignableFrom(t) && t != BaseMsgType)
            {
                var bindMsgAttributes = t.GetCustomAttributes(typeof(BindPushProtocol), false);
                if (bindMsgAttributes.Length == 1)
                {
                    var msg = ((BindPushProtocol)bindMsgAttributes[0]).msg;
                    if (msgHandlers.ContainsKey(msg))
                    {
                        throw new Exception("推送 不允许有重名");
                    }
                    msgHandlers.Add(msg, Activator.CreateInstance(t) as IPushProtocolHandler);
                }
            }

        }

        WsNetwork.OnOpen(Svr_onOpen);
        WsNetwork.OnClose(Svr_onClose);
        await ConnectSvr();
    }

    // Update is called once per frame
    public void Update()
    {
        WsNetwork.ReadMsg();
    }

    public async EasyEmptyTask ConnectSvr()
    {
        // print("connectSvr");
        EasyLogger.Log(()=>"连接服务器中...");
        await WsNetwork.Connect(host, port);
    }

    void Svr_onOpen(byte[] bytes)
    {
        Debug.Log("socket open");
        EasyLogger.Log(()=>"服务器已连接");
        foreach (var protocol in protocols)
        {
            var key = protocol.Key;
            var type = protocol.Value;
            WsNetwork.AddHandler(key, (bytes) =>
            {
                BaseMsg msg = FromJson(bytes, type);
                EasyLogger.Log(()=>$"msgCallBack  {key} : {msg}");
                if (msg.sequenceId > 0 && msgCallbacks.ContainsKey(msg.sequenceId))
                {
                    msgCallbacks[msg.sequenceId](msg);
                    msgCallbacks.Remove(msg.sequenceId);
                }
                else
                {
                    if (msgHandlers.TryGetValue(key, out IPushProtocolHandler handler))
                    {
                        handler.HandleMsg(bytes);
                    }
                }
            });
        }

        connectCallback?.Invoke();
        connectCallback = null;
    }

    void Svr_onClose(byte[] bytes)
    {
        Debug.Log("socket close");
        EasyLogger.Log(()=>"连接服务器中...");
        ConnectLater().Trigger();
    }

    private async EasyVoidTask ConnectLater()
    {
        await EasyTaskRunner.Delay(2000);
        await ConnectSvr();
    }

    public static BaseMsg FromJson(byte[] bytes, Type type)
    {
        return (BaseMsg)JsonUtility.FromJson(Encoding.UTF8.GetString(bytes), type);
    }

    public async EasyEmptyTask DisConnect()
    {
        await WsNetwork.DisConnect();
    }
    
    public void SendMsg(string msg, BaseMsg sendMsg, Action<BaseMsg> callback = null)
    {
        msgSequenceId++;
        sendMsg.sequenceId = msgSequenceId;
        if (callback != null)
        {
            msgCallbacks.Add(msgSequenceId, callback);
        }
        WsNetwork.SendMsg(msg, sendMsg);
    }


}
