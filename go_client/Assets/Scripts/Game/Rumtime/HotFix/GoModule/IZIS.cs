using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Easy;
using UnityEngine;

public class IZIS : MonoBehaviour
{
    public const string LogTag = "IZIS";

    public static IZIS IZISSingleton;

#if UNITY_ANDROID && IZIS
    private AndroidJavaObject IZISActivity;
#endif

    public bool isConnect;
    public string boardData;
    public string buttonData;
    public int boardSize;
    public string errorData;

    public bool IsRunInBoard;

    void Awake()
    {
        IZISSingleton = this;
#if UNITY_ANDROID && IZIS
        var javaClass = new AndroidJavaObject("com.unity3d.player.IZISHelper");
        IZISActivity = javaClass.GetStatic<AndroidJavaObject>("mActivity");
        IsRunInBoard = IZISActivity.Call<bool>("IsRunInBoard");
#endif
    }

    void Start()
    {
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("OpenConnect");
#endif
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    void OnDestroy()
    {
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("CloseConnect");
#endif
    }

    public void OnConnectSuccess(string data)
    {
        EasyLogger.Log(()=>LogTag,()=>"Connect " + data);
        isConnect = true;
    }

    public void OnBoardData(string data)
    {
        errorData = null;
        boardData = data;
        EasyLogger.Log(()=>LogTag,()=>"OnBoardData1 " + LogBoard(boardData));
        boardData = new string(boardData.Reverse().ToArray());
        EasyLogger.Log(()=>LogTag,()=>"OnBoardData2 " + LogBoard(boardData));
    }

    public void OnBoardSize(string data)
    {
        EasyLogger.Log(()=>LogTag,()=>"OnBoardSize " + data);
        boardSize = int.Parse(data);
    }

    public void OnLampLight(string data)
    {
        EasyLogger.Log(()=>LogTag,()=>"OnLampLight " + data);
    }

    public void OnPlayerLight(string data)
    {
        EasyLogger.Log(()=>LogTag,()=>"OnPlayerLight " + data);
    }

    public void OnAllLampClose(string data)
    {
        EasyLogger.Log(()=>LogTag,()=>"OnAllLampClose " + data);
    }

    public void OnReceiveErrorData(string data)
    {
        EasyLogger.Log(()=>LogTag,()=>"onReceiveErrorData " + data);
        errorData = data;
    }

    public void OnBoardButtonClicked(string data)
    {
        EasyLogger.Log(()=>LogTag,()=>"OnBoardButtonClicked " + LogButton(data));
        buttonData = data;
    }

    public void ChangeBoardSize(int size)
    {
        EasyLogger.Log(()=>LogTag,()=>"ChangeBoardSize " + size);
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("ChangeBoardSize", size);
#endif
    }

    // player 1 黑 2白
    public void SetPlayerLight(int player)
    {
        EasyLogger.Log(()=>LogTag,()=>"SetPlayerLight " + player);
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("SetPlayerLight", player);
#endif
    }

    public void AutoSendAllChess(bool status)
    {
        EasyLogger.Log(()=>LogTag,()=>"AutoSendAllChess " + status);
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("AutoSendAllChess", status);
#endif
    }

    public void LightSingleLampPosition(int pos)
    {
        EasyLogger.Log(()=>LogTag,()=>"LightSingleLampPosition " + pos);
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("LightSingleLampPosition", pos);
#endif
    }

    public void LightBoardLampPositions(int size, string boardData)
    {
        EasyLogger.Log(()=>LogTag,()=>"LightBoardLampPositions1 " + size + " " + LogBoard(boardData));
#if UNITY_ANDROID && IZIS
        string data = new string(boardData.Reverse().ToArray());
        IZISActivity.Call("LightBoardLampPositions", size, data);
        EasyLogger.Log(()=>LogTag,()=>"LightBoardLampPositions2 \n" + LogBoard(data));
#endif
    }

    public void LightMultiLampPosition(int size, int[] pos, int[] color)
    {
        EasyLogger.Log(()=>LogTag,()=>"LightBoardLampPositions " + size + " " + string.Join(',',pos) + " " + string.Join(',',color));
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("LightMultiLampPosition", size, pos, color);
#endif
    }

    public void RequestAllChess()
    {
        EasyLogger.Log(()=>LogTag,()=>"RequestAllChess ");
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("RequestAllChess");
#endif
    }

    public void CloseAllLamp()
    {
        EasyLogger.Log(()=>LogTag,()=>"CloseAllLamp ");
#if UNITY_ANDROID && IZIS
        IZISActivity.Call("CloseAllLamp");
#endif
    }

    public string LogBoard(string data)
    {
        int size = 19;
        if(data.Length == 19 * 19)
        {
            size = 19;
        }
        else if(data.Length == 15 * 15)
        {
            size = 15;
        }
        else if(data.Length == 9 * 9)
        {
            size = 9;
        }

        StringBuilder log = new StringBuilder();
        for(int row = 0; row < size; ++row)
        {
            for(int col = 0; col < size; ++col)
            {
                log.Append(data[row * size + col]);
            }
            log.Append("\n");
        }
        return log.ToString();
    }

    public string LogButton(string data)
    {
        string[] buttonData = data.Split('_');
        buttonData[0] = buttonData[0] == "1" ? "黑" : "白";
        buttonData[1] = "-点击次数:" + buttonData[1];
        return buttonData[0] + buttonData[1];
    }
}
