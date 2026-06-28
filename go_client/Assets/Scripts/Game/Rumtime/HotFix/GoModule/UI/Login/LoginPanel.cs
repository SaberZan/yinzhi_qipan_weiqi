using System;
using System.Collections;
using System.Collections.Generic;
using Easy;
using UnityEngine;
using UnityEngine.UI;

[DialogParams(isShowMask = true, triggerMaskClick = false)]
public class LoginPanel : BaseDialogUI
{
    public InputField txtIp => gameObject.GetComponent<Properties>().GetObj<InputField>("txtIp");
    public InputField txtPort => gameObject.GetComponent<Properties>().GetObj<InputField>("txtPort");
    public Button btnLogin => gameObject.GetComponent<Properties>().GetObj<Button>("btnLogin");
    public Toggle togRemPass => gameObject.GetComponent<Properties>().GetObj<Toggle>("togRemPass");
    public InputField txtAccount => gameObject.GetComponent<Properties>().GetObj<InputField>("txtAccount");
    public InputField txtPassword => gameObject.GetComponent<Properties>().GetObj<InputField>("txtPassword");
    public Text txtTip => gameObject.GetComponent<Properties>().GetObj<Text>("txtTip");

    private bool canClickLogin = true;
    //切换用户功能，需要保存登录数据的修改
    private bool tempTip = false;
    private bool saveLoginData = false;
    private bool changeAccountInfo = false;
    private AccountInfo accountInfo = new AccountInfo();
    private LoginProxy loginProxy;

    public override void OnStart()
    {
        txtTip.text = "";

        //获取之前存储的登录信息 设置界面
        loginProxy = ProxyMgr.Instance.Get<LoginProxy>();
        togRemPass.isOn = loginProxy.IsRememberPw();
        txtIp.text = loginProxy.GetIp();
        txtPort.text = loginProxy.GetPort().ToString();
        txtAccount.text = loginProxy.GetAccount();
        if (loginProxy.IsRememberPw())
            txtPassword.text = loginProxy.GetPassword();

        btnLogin.onClick.AddListener(async () =>
        {
            OnClickedLoginIn().Trigger();
        });
    }

    private async EasyVoidTask OnClickedLoginIn()
    {
        if (canClickLogin == false) return;
            canClickLogin = false;

        //判断账号密码长度是否正确
        if (txtAccount.text.Length <= 20 && txtPassword.text.Length <= 20 && txtAccount.text.Length >= 5 && txtPassword.text.Length >= 5)
        {

            bool connect = false;
            NetMgr.Instance.host = txtIp.text;
            NetMgr.Instance.port = int.Parse(txtPort.text);           
            NetMgr.Instance.connectCallback = () =>
            { 
                connect = true;
            };
            await NetMgr.Instance.Start();
            await EasyTaskRunner.WaitUntil(()=>connect);
            
            //发送登录请求消息 判断账号信息是否正确
            LoginMsg sendMsg = new LoginMsg();
            sendMsg.accountInfo = new AccountInfo() { account = txtAccount.text, password = txtPassword.text };
            LoginResultMsg result = null;
            NetMgr.Instance.SendMsg(LoginResultMsg.protocol, sendMsg, async resultMsg=>
            {
                result = (LoginResultMsg)resultMsg;
            });
            await EasyTaskRunner.WaitUntil(()=>result != null);

            SaveDataMgr.Instance.BeginSave("LoginDataInLogin");
            loginProxy.SetIp(txtIp.text);
            loginProxy.SetPort(int.Parse(txtPort.text));
            loginProxy.SetAccount(txtAccount.text);
            loginProxy.SetPassWorld(txtPassword.text);
            loginProxy.SetRememberPw(togRemPass.isOn);
            SaveDataMgr.Instance.EndSave("LoginDataInLogin");

            await NetMgr.Instance.DisConnect();

            
            NetMgr.Instance.host = result.host;
            NetMgr.Instance.port = result.port;
            int uid = result.uid;

            connect = false;
            NetMgr.Instance.connectCallback = () =>
            { 
                connect = true;
            };
            await NetMgr.Instance.ConnectSvr();
            await EasyTaskRunner.WaitUntil(()=>connect);

            NetMgr.Instance.SendMsg(ConnectResultMsg.protocol, new ConnectMsg() { uid = uid }, resultMsg =>
            {
                var result = (ConnectResultMsg)resultMsg;
                LoginIn(result.result);
            });  
        }
        else
        {
            txtTip.text = "账号或密码错误";
            canClickLogin = true;
        }
    }

    public override void Update(float deltaTime)
    {
        base.Update(deltaTime);
        if (tempTip)
        {
            txtTip.text = "账号或密码错误";
            tempTip = false;
        }
        if (saveLoginData == true)
        {
            //保存登录信息到本地
            loginProxy.SetAccount(accountInfo.account);
            loginProxy.SetPassWorld(accountInfo.password);
            saveLoginData = false;
        }
        if (changeAccountInfo)
        {
            txtAccount.text = accountInfo.account;
            txtPassword.text = accountInfo.password;
            changeAccountInfo = false;
        }
    }

    //根据服务器返回的信息， bool 判断是否登录成功
    public void LoginIn(bool can)
    {
        if (can)
        {
            UIMgr.Instance.GetLayer<DialogUILayer>().CloseDialog("LoginPanel");
        }
        else
        {
            tempTip = true;
        }
        canClickLogin = true;
    }

    public void ChangeInfo(string _account, string _password)
    {
        changeAccountInfo = true;
        accountInfo.account = _account;
        accountInfo.password = _password;
    }
}