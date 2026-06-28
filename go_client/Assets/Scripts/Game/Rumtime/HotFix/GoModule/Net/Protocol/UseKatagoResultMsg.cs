using System;

[Serializable]
public class UseKatagoResultMsg : BaseMsg
{
    public const string protocol = "connector.main.useKatago";

    public bool result => code == 200;
}
