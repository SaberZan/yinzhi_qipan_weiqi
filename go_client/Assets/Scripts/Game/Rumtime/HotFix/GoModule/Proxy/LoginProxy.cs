using Easy;

public class LoginProxy : Proxy
{

    public string GetIp()
    {
        return SaveDataMgr.Instance.Get<LoginData>().ip;
    }

    public void SetIp(string ip)
    {
        SaveDataMgr.Instance.BeginSave("LoginData");
        SaveDataMgr.Instance.Get<LoginData>().ip = ip;
        SaveDataMgr.Instance.EndSave("LoginData");
    }

    public int GetPort()
    {
        return SaveDataMgr.Instance.Get<LoginData>().port;
    }

    public void SetPort(int port)
    {
        SaveDataMgr.Instance.BeginSave("LoginData");
        SaveDataMgr.Instance.Get<LoginData>().port = port;
        SaveDataMgr.Instance.EndSave("LoginData");
    }

    public string GetAccount()
    {
        return SaveDataMgr.Instance.Get<LoginData>().account;
    }

    public void SetAccount(string account)
    {
        SaveDataMgr.Instance.BeginSave("LoginData");
        SaveDataMgr.Instance.Get<LoginData>().account = account;
        SaveDataMgr.Instance.EndSave("LoginData");
    }

    public string GetPassword()
    {
        return SaveDataMgr.Instance.Get<LoginData>().password;
    }

    public void SetPassWorld(string password)
    {
        SaveDataMgr.Instance.BeginSave("LoginData");
        SaveDataMgr.Instance.Get<LoginData>().password = password;
        SaveDataMgr.Instance.EndSave("LoginData");
    }

    public bool IsRememberPw()
    {
        return SaveDataMgr.Instance.Get<LoginData>().rememberPw;
    }

    public void SetRememberPw(bool rememberPw)
    {
        SaveDataMgr.Instance.BeginSave("LoginData");
        SaveDataMgr.Instance.Get<LoginData>().rememberPw = rememberPw;
        SaveDataMgr.Instance.EndSave("LoginData");
    }
}