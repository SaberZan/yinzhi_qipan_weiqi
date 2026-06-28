using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using Easy;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class PVEGameEntrancePanel : BaseDialogUI
{
    string[] SizeSelections = new string[] { "9x9", "13x13", "19x19" };
    int[] SizeValues = new int[] { 9, 13, 19 };
    private int sizeIndex = 2;

    public GameObject size => gameObject.GetComponent<Properties>().GetObj<GameObject>("size");
    public Text txtSize => gameObject.GetComponent<Properties>().GetObj<Text>("sizeText");
    public Button btnSizeLeft => gameObject.GetComponent<Properties>().GetObj<Button>("sizeLeft");
    public Button btnSizeRight => gameObject.GetComponent<Properties>().GetObj<Button>("sizeRight");

    private int komiIndex = 7;
    public GameObject komi => gameObject.GetComponent<Properties>().GetObj<GameObject>("komi");
    public Text txtKomi => gameObject.GetComponent<Properties>().GetObj<Text>("komiText");
    public Button btnKomiLeft => gameObject.GetComponent<Properties>().GetObj<Button>("komiLeft");
    public Button btnKomiRight => gameObject.GetComponent<Properties>().GetObj<Button>("komiRight");

    string[] RuleSelections = new string[] { "jp", "cn", "ko", "aga", "tt", "nz" };
    private int ruleIndex = 1;
    public GameObject rule => gameObject.GetComponent<Properties>().GetObj<GameObject>("rule");
    public Text txtRule => gameObject.GetComponent<Properties>().GetObj<Text>("ruleText");
    public Button btnRuleLeft => gameObject.GetComponent<Properties>().GetObj<Button>("ruleLeft");
    public Button btnRuleRight => gameObject.GetComponent<Properties>().GetObj<Button>("ruleRight");

    string[] PlayerSelections = new string[] { "B", "W" };
    private int playerIndex = 0;

    public GameObject player => gameObject.GetComponent<Properties>().GetObj<GameObject>("player");
    public Text txtPlayer => gameObject.GetComponent<Properties>().GetObj<Text>("playerText");
    public Button btnPlayerLeft => gameObject.GetComponent<Properties>().GetObj<Button>("playerLeft");
    public Button btnPlayerRight => gameObject.GetComponent<Properties>().GetObj<Button>("playerRight");

    private int handicapIndex = 0;

    public GameObject handicap => gameObject.GetComponent<Properties>().GetObj<GameObject>("handicap");
    public Text txtHandicap => gameObject.GetComponent<Properties>().GetObj<Text>("handicapText");
    public Button btnHandicapLeft => gameObject.GetComponent<Properties>().GetObj<Button>("handicapLeft");
    public Button btnHandicapRight => gameObject.GetComponent<Properties>().GetObj<Button>("handicapRight");

    private int rankIndex = 0;

    public GameObject rank => gameObject.GetComponent<Properties>().GetObj<GameObject>("rank");
    public Text txtRank => gameObject.GetComponent<Properties>().GetObj<Text>("rankText");
    public Button btnRankLeft => gameObject.GetComponent<Properties>().GetObj<Button>("rankLeft");
    public Button btnRankRight => gameObject.GetComponent<Properties>().GetObj<Button>("rankRight");

    public Button btnStart => gameObject.GetComponent<Properties>().GetObj<Button>("btnStart");


    public override void OnStart()
    {
        InitBtns();
        InitUI();

    }

    private void InitUI()
    {
        txtSize.text = SizeSelections[sizeIndex];
        txtKomi.text = (komiIndex + 0.5f).ToString();
        txtRule.text = RuleSelections[ruleIndex];
        txtPlayer.text = PlayerSelections[playerIndex];
        txtHandicap.text = handicapIndex.ToString();
        if(rankIndex <= 0)
        {
            txtRank.text = $"{1-rankIndex}d";
        }
        else
        {
            txtRank.text = $"{rankIndex}k";
        }
    }

    private void InitBtns()
    {
        btnSizeLeft.onClick.RemoveAllListeners();
        btnSizeLeft.onClick.AddListener(() =>
        {
            sizeIndex = sizeIndex - 1 >= 0 ? sizeIndex - 1 : SizeSelections.Length - 1;
            InitUI();
        });

        btnSizeRight.onClick.RemoveAllListeners();
        btnSizeRight.onClick.AddListener(() =>
        {
            sizeIndex = sizeIndex + 1 < SizeSelections.Length ? sizeIndex + 1 : 0;
            InitUI();
        });

        btnKomiLeft.onClick.RemoveAllListeners();
        btnKomiLeft.onClick.AddListener(() =>
        {
            if(komiIndex <= -50)
            {
                return;
            }
            komiIndex -= 1;
            InitUI();
        });

        btnKomiRight.onClick.RemoveAllListeners();
        btnKomiRight.onClick.AddListener(() =>
        {
            if(komiIndex >= 49)
            {
                return;
            }
            komiIndex += 1;
            InitUI();
        });


        btnRuleLeft.onClick.RemoveAllListeners();
        btnRuleLeft.onClick.AddListener(() =>
        {
            ruleIndex = ruleIndex - 1 >= 0 ? ruleIndex - 1 : RuleSelections.Length - 1;
            InitUI();
        });

        btnRuleRight.onClick.RemoveAllListeners();
        btnRuleRight.onClick.AddListener(() =>
        {
            ruleIndex = ruleIndex + 1 < RuleSelections.Length ? ruleIndex + 1 : 0;
            InitUI();
        });


        btnPlayerLeft.onClick.RemoveAllListeners();
        btnPlayerLeft.onClick.AddListener(() =>
        {
            playerIndex = playerIndex - 1 >= 0 ? playerIndex - 1 : PlayerSelections.Length - 1;
            InitUI();
        });

        btnPlayerRight.onClick.RemoveAllListeners();
        btnPlayerRight.onClick.AddListener(() =>
        {
            playerIndex = playerIndex + 1 < PlayerSelections.Length ? playerIndex + 1 : 0;
            InitUI();
        });

        btnHandicapLeft.onClick.RemoveAllListeners();
        btnHandicapLeft.onClick.AddListener(() =>
        {
            if(handicapIndex <= 0)
            {
                return;
            }
            handicapIndex -= 1;
            InitUI();
        });

        btnHandicapRight.onClick.RemoveAllListeners();
        btnHandicapRight.onClick.AddListener(() =>
        {
            if(handicapIndex >= 9)
            {
                return;
            }
            handicapIndex += 1;
            InitUI();
        });

        btnRankLeft.onClick.RemoveAllListeners();
        btnRankLeft.onClick.AddListener(() =>
        {
            if(rankIndex <= 9)
            {
                return;
            }
            rankIndex -= 1;
            InitUI();
        });

        btnRankRight.onClick.RemoveAllListeners();
        btnRankRight.onClick.AddListener(() =>
        {
            if(rankIndex >= 20)
            {
                return;
            }
            rankIndex += 1;
            InitUI();
        });

        btnStart.onClick.RemoveAllListeners();
        btnStart.onClick.AddListener(() =>
        {
            LoadSceneAndDoSomething();
        });
    }

    private void LoadSceneAndDoSomething()
    {
        KatagoHelper.CreateKatago<OnLineKatago>((v)=>
        {
            if(v)
            {
                ProxyMgr.Instance.Get<BoardProxy>().SetCurBoardSize(SizeValues[sizeIndex]);
                ProxyMgr.Instance.Get<BoardProxy>().SetKomi(komiIndex + 0.5f);
                ProxyMgr.Instance.Get<BoardProxy>().SetOtherRank(rankIndex);
                ProxyMgr.Instance.Get<BoardProxy>().SetSelfColor(playerIndex == 0);
                ProxyMgr.Instance.Get<BoardProxy>().SetRule(RuleSelections[ruleIndex]);
                ProxyMgr.Instance.Get<BoardProxy>().SetHandicap(handicapIndex);

                UIMgr.Instance.GetLayer<GameLayer>().CloseView("PVEGameEntrancePanel");
                var pve = UIMgr.Instance.GetLayer<GameLayer>().ShowView<PVE>();
                pve.ShowChessBoard().Trigger();
            }
        });
        
        UIMgr.Instance.GetLayer<DialogUILayer>().CloseAllDialog();
    }
}
