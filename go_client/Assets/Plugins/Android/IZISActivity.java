package com.unity3d.player;

import android.os.Bundle;
import android.widget.Toast;

import com.izis.serialport.device_id.OSInfo;
import com.izis.serialport.connect.SerialConnect;
import com.izis.serialport.connect.SerialConnectDirect;
import com.izis.serialport.listener.SerialConnectListener;
import com.izis.serialport.listener.SerialReceiveDataListener;
import com.izis.serialport.protocol.BoardProtocol;


import java.util.ArrayList;
import java.util.List;

public class IZISActivity extends UnityPlayerActivity implements SerialConnectListener, SerialReceiveDataListener {
    private SerialConnect connect;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        IZISHelper.mActivity = this;
        connect = new SerialConnectDirect(this);
        connect.setConnectListener(this);
        connect.setReceiveDataListener(this);
    }

    @Override
    public void onConnectSuccess() {
        Toast.makeText(this, "连接成功", Toast.LENGTH_SHORT).show();
        runOnUiThread( new Runnable() {
               @Override
               public void run() {
                   UnityPlayer.UnitySendMessage("IZIS", "OnConnectSuccess", "true");
               }
           }
        );
    }
    @Override
    public void onReceiveNormalData(String data) {
        runOnUiThread( new Runnable() {
                @Override
                public void run() {
                    //棋盘信息
                    if(data.startsWith("~SDA")) {
                        int dataLen = data.length();
                        String msg = data.substring(4, dataLen - 1);
                        UnityPlayer.UnitySendMessage("IZIS", "OnBoardData", msg);
                    }
                    //棋盘大小
                    else if(data.startsWith("~GBS")) {
                        int dataLen = data.length();
                        String msg = data.substring(4, dataLen - 1);
                        UnityPlayer.UnitySendMessage("IZIS", "OnBoardSize", msg);
                    }
                    //单个灯亮
                    else if(data.startsWith("~HCS")) {
                        UnityPlayer.UnitySendMessage("IZIS", "OnLampLight", "");
                    }
                    //行棋灯亮
                    else if(data.startsWith("~LOS")) {
                        UnityPlayer.UnitySendMessage("IZIS", "OnPlayerLight", "");
                    }
                    //棋盘灯灭
                    else if(data.startsWith("~ALC")) {
                        UnityPlayer.UnitySendMessage("IZIS", "OnAllLampClose", "");
                    }
                    //黑棋拍钟
                    else if(data.startsWith("~BKY")) {
                        UnityPlayer.UnitySendMessage("IZIS", "OnBoardButtonClicked", "1_1");
                    }
                    //白棋拍钟
                    else if(data.startsWith("~WKY")) {
                        UnityPlayer.UnitySendMessage("IZIS", "OnBoardButtonClicked", "2_1");
                    }
                    //黑棋双拍
                    else if(data.startsWith("~BTY")) {
                        UnityPlayer.UnitySendMessage("IZIS", "OnBoardButtonClicked", "1_2");
                    }
                    //白棋双拍
                    else if(data.startsWith("~WTY")) {
                        UnityPlayer.UnitySendMessage("IZIS", "OnBoardButtonClicked", "2_2");
                    }
                }
            }
        );
    }

    @Override
    public void onReceiveErrorData(String data) {
        runOnUiThread( new Runnable() {
               @Override
               public void run() {
                   UnityPlayer.UnitySendMessage("IZIS", "OnReceiveErrorData", data);
               }
           }
        );
    }

    public boolean IsRunInBoard() {
        return OSInfo.isBoard(this);
    }
    
    public void OpenConnect() {
        connect.open();
    }

    public void CloseConnect() {
        connect.close();
    }

    public void ChangeBoardSize(int size){
        connect.addCommend(BoardProtocol.Down.boardSize(size));
    }

    public void SetPlayerLight(int player) {
        connect.addCommend((BoardProtocol.Down.lamp(player)));
    }

    public void AutoSendAllChess(boolean status) {
        connect.addCommend((BoardProtocol.Down.autoSendAllChess(status)));
    }

    public void RequestAllChess() {
        connect.addCommend(BoardProtocol.Down.requestAllChess());
    }

    public void LightSingleLampPosition(int pos) {
        connect.addCommend(BoardProtocol.Down.lampPosition(pos,  1));
    }

    public void LightBoardLampPositions(int size, String pos) {
        int len = pos.length();
        List<int[]> arr = new ArrayList<>(len);
        for(int i = 0; i < len; ++i) {
            if(pos.charAt(i) == '0') {
                continue;
            }
            arr.add(new int[]{i + 1,Character.getNumericValue(pos.charAt(i))});
        }
        connect.addCommend(BoardProtocol.Down.lampMultiple(size, arr, 0));
    }

    public void LightMultiLampPosition(int size, int[] pos, int[] colors) {
        List<int[]> arr = new ArrayList<>(pos.length);
        for(int i = 0; i < pos.length; ++i) {
            arr.add(new int[]{pos[i] + 1, colors[i]});
        }
        connect.addCommend(BoardProtocol.Down.lampMultiple(size, arr, 0));
    }

    public void CloseAllLamp() {
        connect.addCommend(BoardProtocol.Down.closeAllLamp());
    }

    public void ShowWaring(){
        connect.addCommend(BoardProtocol.Down.warning());
    }

}
