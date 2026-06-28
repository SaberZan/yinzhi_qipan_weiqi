using System;

public interface IPushProtocolHandler
{
    void HandleMsg(byte[] bytes);
}

public class BindPushProtocol : Attribute
{
    public string msg;

    public BindPushProtocol(string key)
    {
        msg = key;
    }
}