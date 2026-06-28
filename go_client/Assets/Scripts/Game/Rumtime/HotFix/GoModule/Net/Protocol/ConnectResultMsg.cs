using System;

[Serializable]
public class ConnectResultMsg : BaseMsg
{
    public const string protocol = "connector.main.enter";
    public bool result => code == 200;
}
