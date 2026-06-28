using System.Collections;
using System.Collections.Generic;
using Easy;
using UnityEngine;

public class GoModuleInterface : IModuleInterface
{ 
}

public class GoModule : BaseModule
{
    private GoModuleInterface goModuleInterface = new GoModuleInterface();
    public override IModuleInterface moduleInterface => goModuleInterface;
    private ISingleUnityAssetHandle<GameObject> chessBoardHandle;
    private GameObject chessBoard;

    private GameObject izis;
    public override string GetName()
    {
        return "Go";
    }

    public override void Start()
    {
        base.Start();
        // UIMgr.Instance.AddLayer(new GameLayer());

        chessBoardHandle = AssetsMgr.Instance.LoadAsset<GameObject>("Assets/GameResources/Go/ChessBoard.prefab");
        chessBoard = chessBoardHandle.Instantiate();
        chessBoard.name = "ChessBoard";

        izis = new GameObject("IZIS").AddComponent<IZIS>().gameObject;

        UIMgr.Instance.GetLayer<GameLayer>().ShowView<PVEGameEntrancePanel>("Assets/GameResources/Go/GameEntrancePanel.prefab");

        UIMgr.Instance.GetLayer<DialogUILayer>().ShowDialog("LoginPanel", "Assets/GameResources/Go/LoginPanel.prefab");
    }

    public override void Update(float detailTime)
    {
        NetMgr.Instance.Update();
    }

    public override void Destory()
    {
        base.Destory();
        UIMgr.Instance.GetLayer<GameLayer>().CloseAll();
        GameObject.Destroy(chessBoard);
        GameObject.Destroy(izis);
        NetMgr.Instance.DisConnect().Trigger();
    }
}
