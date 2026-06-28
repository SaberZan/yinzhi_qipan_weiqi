using System;

[Serializable]
public class LoginResultMsg : BaseMsg
{
    public const string protocol = "gate.main.login";
    public bool result => code == 200;
    public int uid;
    public string host;
    public int port;
}
