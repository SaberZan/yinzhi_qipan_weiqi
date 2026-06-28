using System.Collections;
using System.Collections.Generic;
using Easy;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

public class GameResultPanel : BaseDialogUI
{
    public Button btnshowpanel => gameObject.GetComponent<Properties>().GetObj<Button>("btnshowpanel");
    public Text txtResult => gameObject.GetComponent<Properties>().GetObj<Text>("txtResult");
    public Text txtReason => gameObject.GetComponent<Properties>().GetObj<Text>("txtReason");
    public UnityAction action;

    public override void OnStart()
    {
        base.OnStart();
        btnshowpanel.onClick.AddListener(() =>
        {
            action?.Invoke();
        });
    }

    public void ChangeTxtInfo(string result, string reason)
    {
        txtResult.text = result;
        txtReason.text = reason;
    }

    public override void OnDestroy()
    {
        base.OnDestroy();
        action = null;//�����ڴ�й¶
    }
}
