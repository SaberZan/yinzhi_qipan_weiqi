using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy;


public class LoginData : SaveData
{
    public string ip;
    public int port;
    public string account;
    public string password;

    //是否记住密码
    public bool rememberPw;

    public override void CopyValue(SaveData data)
    {
        if (data is LoginData loginData)
        {
            account = loginData.account;
            password = loginData.password;
            ip = loginData.ip;
            port = loginData.port;
            rememberPw = loginData.rememberPw;
        }
    }
}

