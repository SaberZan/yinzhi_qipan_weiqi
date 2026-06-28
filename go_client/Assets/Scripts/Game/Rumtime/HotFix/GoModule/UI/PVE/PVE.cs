using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy;
using UnityEngine;
using UnityEngine.UI;

public class PVE : BaseUI
{

    private Image headIcon1 => gameObject.GetComponent<Properties>().GetObj<Image>("headIcon1");

    private Image headIcon2 => gameObject.GetComponent<Properties>().GetObj<Image>("headIcon2");
    private Text player1 => gameObject.GetComponent<Properties>().GetObj<Text>("player1");

    private Text player2 => gameObject.GetComponent<Properties>().GetObj<Text>("player2");

    private Text winRate1 => gameObject.GetComponent<Properties>().GetObj<Text>("winRate1");

    private Text winRate2 => gameObject.GetComponent<Properties>().GetObj<Text>("winRate2");

    private Text chiZi1 => gameObject.GetComponent<Properties>().GetObj<Text>("chizi1");

    private Text chiZi2 => gameObject.GetComponent<Properties>().GetObj<Text>("chizi2");

    private Toggle putDownTypeTooggle => gameObject.GetComponent<Properties>().GetObj<Toggle>("putDownType");
    private Toggle ownerShipTooggle => gameObject.GetComponent<Properties>().GetObj<Toggle>("ownerShip");

    private Button pause => gameObject.GetComponent<Properties>().GetObj<Button>("pause");

    public static string alphabet = "ABCDEFGHJKLMNOPQRSTUVWXYZ";


    private Transform LeftTop;
    private Transform RightBottom;

    private Vector3 LTPos;
    private Vector3 RBPos;

    public int size;

    private int[,] board;
    private Renderer[,] chesses;
    private bool[,] transparent;
    private SpriteRenderer[,] ownerShips;

    private float[,] ownerShipData;

    private float halfGridWidth = 1;
    private float halfGridHeight = 1;
    private int rowi = 0, coli = 0;
    private bool initialColor;
    private bool canFall = false;
    private bool[,] visited;
    private List<Tuple<int, int>> eatenChesses = new List<Tuple<int, int>>();
    private List<Tuple<int, int>> tempCheeses = new List<Tuple<int, int>>();
    private Tuple<int, int> jie = new Tuple<int, int>(-1, -1);
    private bool prevJie = false;

    private bool canplay = false;

    private bool turn = true; // true :black, false : white
    private string pos;

    private bool showOwnerShip = true;

    private TextStep textStep = null;

    private int step = 0;

    private int[] eatCounts = new int[] {0,0};

#if UNITY_ANDROID && IZIS
    private bool triggerPutDown = true;
    private float _checkTime = 0.2f;
    private int _step;
    private string _chessData;
    public string chessData  
    {
        get
        {
            if(_chessData == null || step != _step)
            {
                StringBuilder stringBuilder = new StringBuilder();
                for (int rowi = 0; rowi < size; rowi++)
                {
                    for (int coli = 0; coli < size; coli++)
                    {
                        stringBuilder.Append(board[rowi, coli].ToString());
                    }
                }
                _chessData = stringBuilder.ToString();
                _step = step;
            }
            return _chessData;
        }
    }
#endif

    public override void OnStart()
    {
        base.OnStart();

        pause.onClick.RemoveAllListeners();
        pause.onClick.AddListener(() =>
        {
            UIMgr.Instance.GetLayer<DialogUILayer>().ShowDialog("PVEPausePanel", "Assets/GameResources/Go/PausePanel.prefab");
            canplay = false;
        });

        ownerShipTooggle.onValueChanged.RemoveAllListeners();
        ownerShipTooggle.onValueChanged.AddListener((isOn) =>
        {
            showOwnerShip = isOn;
        });

        putDownTypeTooggle.gameObject.SetActive(false);
#if UNITY_ANDROID && IZIS
        putDownTypeTooggle.gameObject.SetActive(IZIS.IZISSingleton.IsRunInBoard);
        putDownTypeTooggle.onValueChanged.RemoveAllListeners();
        putDownTypeTooggle.onValueChanged.AddListener((isOn) =>
        {
            triggerPutDown = isOn;
        });
#endif
    }

    public override void OnDestroy()
    {
        GetChessBoard(9).SetActive(false);
        GetChessBoard(13).SetActive(false);
        GetChessBoard(19).SetActive(false);
        base.OnDestroy();
    }

    public override void Update(float deltaTime)
    {
        if (!canplay) return;
        if (turn == initialColor) 
        {
            LTPos = Camera.main.WorldToScreenPoint(LeftTop.transform.position);
            RBPos = Camera.main.WorldToScreenPoint(RightBottom.transform.position);

            halfGridWidth = (RBPos.x - LTPos.x) / (size * 2 - 2);
            halfGridHeight = (LTPos.y - RBPos.y) / (size * 2 - 2);

            bool canPutDown = false;

#if UNITY_ANDROID && IZIS
            if(IZIS.IZISSingleton.IsRunInBoard)
            {
                bool check = false;
                if(triggerPutDown)
                {
                    if(IZIS.IZISSingleton.buttonData.StartsWith((turn ? '1' : '2')))
                    {
                        IZIS.IZISSingleton.buttonData = "";
                        check = true;
                    }
                }
                else
                {
                    _checkTime -= deltaTime;
                    if(_checkTime <= 0)
                    {
                        _checkTime = 0.2f;
                        check = true;
                    }
                }

            	if(check && IZIS.IZISSingleton.boardData != chessData)
            	{

                	int diffIndex = -1;
                	int diffCount = 0;
                	for(int i = 0; i < IZIS.IZISSingleton.boardData.Length; ++i)
                	{
                    	if(IZIS.IZISSingleton.boardData[i] != chessData[i] && IZIS.IZISSingleton.boardData[i] != 0)
                    	{
                        	if(IZIS.IZISSingleton.boardData[i] == (turn ? '1' : '2'))
 
                            {
                                diffIndex = i;
                            }
                            diffCount++;
                        }
                    }


                	if(diffCount == 1 && diffIndex != -1)
                	{
                    	coli = diffIndex % size;
                    	rowi = diffIndex / size;

                    	if (board[rowi, coli] == 0)
                    	{
                        	transparent[rowi, coli] = true;
                        	canFall = true;
                    	}
                    	else
                    	{
                        	canFall = false;
                    	}
                    	if(canFall)
                    	{
                        	coli = diffIndex % size;
                        	rowi = (int)Math.Ceiling(diffIndex * 1f / size);
                        	if (board[rowi, coli] == 0)
                        	{
                            	transparent[rowi, coli] = true;
                            	canFall = true;
                        	}
                        	else
                        	{
                            	canFall = false;
                        	}
                        	if(canFall)
                        	{
                            	canPutDown = true;
                        	}
                        }
                    }
                }
            }
#endif

            if(Input.GetMouseButton(0) || Input.GetMouseButtonDown(0) || Input.GetMouseButtonUp(0))
            {
                int colt = (int)((Input.mousePosition.x - LTPos.x) / halfGridWidth);
                int rowt = (int)((Input.mousePosition.y - RBPos.y) / halfGridHeight);
                coli = (colt + 1) / 2;
                rowi = (rowt + 1) / 2;
                if (colt >= 0 && rowt >= 0 && rowi >= 0 && rowi < size && coli >= 0 && coli < size)
                {
                    if (board[rowi, coli] == 0)
                    {
                        transparent[rowi, coli] = true;
                        canFall = true;
                    }
                    else
                    {
                        canFall = false;
                    }
                }
                else
                {
                    canFall = false;
                }
                if(Input.GetMouseButtonUp(0))
                {
                    canPutDown = true;
                }
            }

            if (canFall && canPutDown)
            {
                
                if (FallChess(rowi, coli, turn ? 1 : 2) == true)
                {
                    canplay = false;

                    ShowTextObj(++step, !turn, chesses[rowi, coli].transform.position);
                    string gtp = alphabet[coli] + (rowi + 1).ToString();
                    KatagoHelper.katago.Play(turn ? "b" : "w", gtp, async (playResult)=>
                    {

                        float blackWinRate = playResult.blackWinRate;
                        winRate1.text = (1- blackWinRate).ToString("0.00");
                        winRate2.text = blackWinRate.ToString("0.00");
                        ownerShipData = VarToGrid(playResult.ownerShip, size);
                        turn = !turn;
#if UNITY_ANDROID && IZIS
                        if(IZIS.IZISSingleton.IsRunInBoard)
                        {
                            IZIS.IZISSingleton.LightBoardLampPositions(size, chessData);
                            await EasyTaskRunner.WaitUntil(() => IZIS.IZISSingleton.boardData == chessData);
                            IZIS.IZISSingleton.CloseAllLamp();
                            IZIS.IZISSingleton.SetPlayerLight(!turn ? 1 : 2);
                            IZIS.IZISSingleton.buttonData = "";
                        }
#endif
                        canplay = true;
                    });
                    
                }
            }
        }
        else
        {
            canplay = false;
            async void genMove()
            {
                var genMoveResult = await KatagoHelper.katago.Genmove(turn ? "b" : "w", (v)=>{});
                pos = genMoveResult.move;
                float blackWinRate = genMoveResult.blackWinRate;
                winRate1.text = (1- blackWinRate).ToString("0.00");
                winRate2.text = blackWinRate.ToString("0.00");
                ownerShipData = VarToGrid(genMoveResult.ownerShip, size);

                if (pos == "pass")
                {
                    UIMgr.Instance.GetLayer<ToastUILayer>().Toast("停一手");
                }
                else
                {
                    (rowi, coli) = (0,0);
                    coli = alphabet.IndexOf(pos[0]); //col
                    rowi = int.Parse(pos.Substring(1)) - 1; //raw

                    FallChess(rowi, coli, turn ? 1 : 2);
                    ShowTextObj(++step, !turn, chesses[rowi, coli].transform.position);
                }
                turn = !turn;
#if UNITY_ANDROID && IZIS
                if(IZIS.IZISSingleton.IsRunInBoard)
                {
                    IZIS.IZISSingleton.LightBoardLampPositions(size, chessData);
                    await EasyTaskRunner.WaitUntil(() => IZIS.IZISSingleton.boardData == chessData);
                    IZIS.IZISSingleton.CloseAllLamp();
                    IZIS.IZISSingleton.SetPlayerLight(turn ? 1 : 2);
                }
#endif
                canplay = true;
            };
            genMove();           
        }
        DrawBoard();
    }

    public GameObject GetChessBoard(int size)
    {
        return GameObject.Find("ChessBoard").transform.Find($"ChessBoard{size}").gameObject;
    }

    public float[,] VarToGrid(float[] data, int size)
    {
        int width = size;
        int height = size;
        float[,] grid = new float[height, width];
        for (int y = height - 1; y >= 0; y--) {
            for (int x = 0; x < width; x++) {
                grid[y,x] = data[ (height - 1 - y) * width + x];
            }
        }
        return grid;
    }

    public async EasyVoidTask ShowChessBoard()
    {
        size = ProxyMgr.Instance.Get<BoardProxy>().GetCurBoardSize();
        initialColor = ProxyMgr.Instance.Get<BoardProxy>().GetSelfColor();
        var rank = ProxyMgr.Instance.Get<BoardProxy>().GetOtherRank();
        var komi = ProxyMgr.Instance.Get<BoardProxy>().GetKomi();
        var handicap = ProxyMgr.Instance.Get<BoardProxy>().GetHandicap();
        var rule = ProxyMgr.Instance.Get<BoardProxy>().GetRule();

        if (initialColor) //true 为白
        {
            var aiSprite = headIcon1.sprite;
            headIcon1.sprite = headIcon2.sprite;
            headIcon2.sprite = aiSprite;
            player1.text = "Self";
            player2.text = "Robot";
            winRate1.text = "50%";
            winRate2.text = "50%";
        }
        else
        {
            player2.text = "Self";
            player1.text = "Robot";
            winRate1.text = "50%";
            winRate2.text = "50%";
        }
        chiZi1.text = "0";
        chiZi2.text = "0";


        GetChessBoard(size).SetActive(true);
        switch (size)
        {
            case 9:
                GetChessBoard(13).SetActive(false);
                GetChessBoard(19).SetActive(false);
                break;
            case 13:
                GetChessBoard(9).SetActive(false);
                GetChessBoard(19).SetActive(false);
                break;
            case 19:
                GetChessBoard(9).SetActive(false);
                GetChessBoard(13).SetActive(false);
                break;
        }

        turn = true;

        board = new int[size, size];
        chesses = new Renderer[size, size];
        transparent = new bool[size, size];
        visited = new bool[size, size];
        ownerShips = new SpriteRenderer[size, size];
        ownerShipData = new float[size, size];

        Transform cb = GetChessBoard(size).transform;
        LeftTop = cb.Find("LeftTop");
        RightBottom = cb.Find("RightBottom");

        Transform row;
        for (int y = 0; y < size; ++y)
        {
            row = cb.Find($"row{y + 1}");
            for (int x = 0; x < size; ++x)
            {
                chesses[y, x] = row.Find($"Chess{y + 1}_{x + 1}").gameObject.GetComponent<Renderer>();
                chesses[y, x].material.color = new Color(chesses[y, x].material.color.r, chesses[y, x].material.color.g, chesses[y, x].material.color.b, 0);

                var obj = GameObjectPoolMgr.Instance.GetGameObject("Assets/GameResources/Go/3dOwnerShip.prefab");
                obj.transform.position = chesses[y, x].transform.position;
                ownerShips[y,x] = obj.GetComponent<SpriteRenderer>();
            }
        }

        var coords = cb.transform.Find("coords");
        for (int y = 0; y < size; ++y)
        {
            var obj = GameObjectPoolMgr.Instance.GetGameObject("Assets/GameResources/Go/3dStep.prefab");
            obj.transform.SetParent(coords);
            obj.transform.position = chesses[y, 0].transform.position - new Vector3(0.2f,0,0);
            obj.GetComponent<TextStep>().textStep.text = (y + 1).ToString();
        }
        for (int x = 0; x < size; ++x)
        {
            var obj = GameObjectPoolMgr.Instance.GetGameObject("Assets/GameResources/Go/3dStep.prefab");
            obj.transform.SetParent(coords);
            obj.transform.position = chesses[0, x].transform.position - new Vector3(0,0.2f,0);
            obj.GetComponent<TextStep>().textStep.text = alphabet[x].ToString();
        }

        await KatagoHelper.katago.InitGame(size, rule, komi, handicap, rank, initialColor? "B" : "W");

#if UNITY_ANDROID && IZIS
        if(IZIS.IZISSingleton.IsRunInBoard)
        {
            await EasyTaskRunner.WaitUntil(() => IZIS.IZISSingleton.isConnect);
            IZIS.IZISSingleton.CloseAllLamp();
            IZIS.IZISSingleton.ChangeBoardSize(size);
            IZIS.IZISSingleton.AutoSendAllChess(true);
            IZIS.IZISSingleton.SetPlayerLight(turn ? 1 : 2);
            IZIS.IZISSingleton.RequestAllChess();
            await EasyTaskRunner.WaitUntil(() => !string.IsNullOrEmpty(IZIS.IZISSingleton.boardData) && IZIS.IZISSingleton.boardData.All(x=>x == '0'));
        }
#endif

        canplay = true;
    }

    private void DrawBoard()
    {
        for (int row = 0; row < size; ++row)
        {
            for (int col = 0; col < size; ++col)
            {
                if (board[row, col] == 0)
                {
                    chesses[row, col].material.color = new Color(chesses[row, col].material.color.r, chesses[row, col].material.color.g, chesses[row, col].material.color.b, 0f);
                    if (transparent[row, col] == true && turn == initialColor)
                    {
                        if (turn)
                            chesses[row, col].material.color = new Color(0, 0, 0, 0.5f);
                        else if (!turn)
                            chesses[row, col].material.color = new Color(1, 1, 1, 0.5f);
                        transparent[row, col] = false;
                    }
                }
                if (board[row, col] == 1)
                {
                    chesses[row, col].material.color = Color.black;
                }
                else if (board[row, col] == 2)
                {
                    chesses[row, col].material.color = Color.white;
                }

                if(showOwnerShip)
                {
                    if(ownerShipData[row,col] < 0.01 && ownerShipData[row,col] > -0.01)
                    {
                        ownerShips[row,col].color = new Color(0, 0, 0, 0);
                        ownerShips[row,col].transform.localScale = Vector3.one;
                    }
                    else if(ownerShipData[row,col] > 0)
                    {
                        ownerShips[row,col].color = Color.black;
                        ownerShips[row,col].transform.localScale = new Vector3(ownerShipData[row,col], ownerShipData[row,col], 1);
                    }
                    else
                    {
                        ownerShips[row,col].color = Color.white;
                        ownerShips[row,col].transform.localScale = new Vector3(-ownerShipData[row,col], -ownerShipData[row,col], 1);
                    }
                }
            }
        }
    }

    public async EasyVoidTask Pass()
    {
        if(turn != initialColor)
        {
            return;
        }

        canplay = false;
        await KatagoHelper.katago.Play(turn ? "b" : "w", "pass", (playResult)=>
        {
            float blackWinRate = playResult.blackWinRate;
            winRate1.text = (1- blackWinRate).ToString("0.00");
            winRate2.text = blackWinRate.ToString("0.00");
            ownerShipData = VarToGrid(playResult.ownerShip, size);
        });
        turn = !turn;
        UIMgr.Instance.GetLayer<ToastUILayer>().Toast("停一手");
#if UNITY_ANDROID && IZIS
        if(IZIS.IZISSingleton.IsRunInBoard)
        {
            await EasyTaskRunner.WaitUntil(() => IZIS.IZISSingleton.boardData == chessData);
            IZIS.IZISSingleton.CloseAllLamp();
            IZIS.IZISSingleton.SetPlayerLight(turn ? 1 : 2);
        }
#endif
        canplay = true;

    }

    public async EasyVoidTask Resign()
    {
        if(turn != initialColor)
        {
            return;
        }

        canplay = false;

        UIData uIData = UIData.Get();

        UIMgr.Instance.GetLayer<DialogUILayer>().ShowDialog("GameResultPanel", "Assets/GameResources/Go/GameResultPanel.prefab");
        GameResultPanel panel = UIMgr.Instance.GetLayer<DialogUILayer>().GetDialog("GameResultPanel") as GameResultPanel;
        var result = await  KatagoHelper.katago.Resign();
        panel.ChangeTxtInfo("","");

        await EasyTaskRunner.WaitUntil(()=> UIMgr.Instance.GetLayer<DialogUILayer>().GetDialog("GameResultPanel") == null);

        KatagoHelper.CloseKatago(()=>{});
        UIMgr.Instance.GetLayer<GameLayer>().CloseView("PVE");
        UIMgr.Instance.GetLayer<GameLayer>().ShowView<PVEGameEntrancePanel>("Assets/GameResources/Go/GameEntrancePanel.prefab");
    }

    public async EasyVoidTask ManualScore()
    {

        if(turn != initialColor)
        {
            return;
        }

        canplay = false;
        UIMgr.Instance.GetLayer<DialogUILayer>().ShowDialog("GameResultPanel", "Assets/GameResources/Go/GameResultPanel.prefab");
        GameResultPanel panel = UIMgr.Instance.GetLayer<DialogUILayer>().GetDialog("GameResultPanel") as GameResultPanel;
        var result = await  KatagoHelper.katago.ManualScore();
        panel.ChangeTxtInfo("","");

        await EasyTaskRunner.WaitUntil(()=> UIMgr.Instance.GetLayer<DialogUILayer>().GetDialog("GameResultPanel") == null);

        KatagoHelper.CloseKatago(()=>{});
        UIMgr.Instance.GetLayer<GameLayer>().CloseView("PVE");
        UIMgr.Instance.GetLayer<GameLayer>().ShowView<PVEGameEntrancePanel>("Assets/GameResources/Go/GameEntrancePanel.prefab");
    }

    protected void ShowTextObj(int _step, bool _blackcolor, Vector3 _position)
    {
        if (textStep == null || textStep.gameObject.activeSelf == false)
            textStep = GameObjectPoolMgr.Instance.GetGameObject("Assets/GameResources/Go/3dStep.prefab").GetComponent<TextStep>();
        textStep.InitText(_step, _blackcolor, _position, size == 19 ? 0.8f : (size == 13 ? 0.9f : 1f));
    }

    public async EasyVoidTask DelayCanPlay()
    {
        await EasyTaskRunner.Yield();
        canplay = true;
    }

    private bool hasAir(int i, int j, int type)
    {
        if (board[i, j] == 0) return true;
        if (board[i, j] != type) return false;

        visited[i, j] = true;
        tempCheeses.Add(new Tuple<int, int>(i, j));
        if (j < size - 1 && !visited[i, j + 1] && hasAir(i, j + 1, type))
        {
            return true;
        }
        if (i > 0 && !visited[i - 1, j] && hasAir(i - 1, j, type))
        {
            return true;
        }
        if (j > 0 && !visited[i, j - 1] && hasAir(i, j - 1, type))
        {
            return true;
        }
        if (i < size - 1 && !visited[i + 1, j] && hasAir(i + 1, j, type))
        {
            return true;
        }
        return false;
    }

    private void ResetVisited()
    {
        for (int i = 0; i < size; ++i)
            for (int j = 0; j < size; ++j)
                visited[i, j] = false;
    }

    private void eatChesses(out int cnt, out int[] firstEatenChess)
    {
        cnt = 0;
        firstEatenChess = new int[2] { -1, -1 };
        foreach (var item in eatenChesses)
        {
            cnt++;
            board[item.Item1, item.Item2] = 0;
            if (cnt == 1)
            {
                firstEatenChess[0] = item.Item1;
                firstEatenChess[1] = item.Item2;
            }
        }
        eatenChesses.Clear();
    }

    private bool FallChess(int row, int col, int type)
    {
        board[row, col] = type;

        bool self_hasAir = hasAir(row, col, type);
        tempCheeses.Clear();
        ResetVisited();
        int opposite_type = (type == 1 ? 2 : 1);
        bool other_hasAir = true;
        bool playmusic = true;
        int eatcount = 0;

        if (col < size - 1 && !visited[row, col + 1] && board[row, col + 1] == opposite_type)
        {
            if (hasAir(row, col + 1, opposite_type) == false)
            {
                other_hasAir = false;
                foreach (var item in tempCheeses)
                {
                    eatenChesses.Add(item);
                }
            }
            tempCheeses.Clear();
            ResetVisited();
        }

        if (row > 0 && !visited[row - 1, col] && board[row - 1, col] == opposite_type)
        {
            if (hasAir(row - 1, col, opposite_type) == false)
            {
                other_hasAir = false;
                foreach (var item in tempCheeses)
                {
                    eatenChesses.Add(item);
                }
            }
            tempCheeses.Clear();
            ResetVisited();
        }

        if (col > 0 && !visited[row, col - 1] && board[row, col - 1] == opposite_type)
        {
            if (hasAir(row, col - 1, opposite_type) == false)
            {
                other_hasAir = false;
                foreach (var item in tempCheeses)
                {
                    eatenChesses.Add(item);
                }
            }
            tempCheeses.Clear();
            ResetVisited();
        }

        if (row < size - 1 && !visited[row + 1, col] && board[row + 1, col] == opposite_type)
        {
            if (hasAir(row + 1, col, opposite_type) == false)
            {
                other_hasAir = false;
                foreach (var item in tempCheeses)
                {
                    eatenChesses.Add(item);
                }
            }
            tempCheeses.Clear();
            ResetVisited();
        }

        eatChesses(out eatcount, out int[] eatenChess);
        if (eatcount == 1)
        {
            if (prevJie == true && eatenChess[0] == jie.Item1 && eatenChess[1] == jie.Item2)
            {
                board[row, col] = 0;
                board[eatenChess[0], eatenChess[1]] = opposite_type;
                playmusic = false;
                // print("???????????????!");
            }
            else
            {
                jie = new Tuple<int, int>(row, col);
                prevJie = true;
            }
        }
        else
        {
            prevJie = false;
        }

        if (self_hasAir == false && other_hasAir == true)
        {
            board[row, col] = 0;
            playmusic = false;
            // print("???????!");
        }

        eatCounts[type - 1] += eatcount;
        if(type == 1)
        {
            chiZi1.text = eatCounts[0].ToString();
        }
        else if(type == 2)
        {
            chiZi2.text = eatCounts[1].ToString();
        }

        if (playmusic == true)//???????????????
        {
            return true;
        }
        return false;
    }
}
