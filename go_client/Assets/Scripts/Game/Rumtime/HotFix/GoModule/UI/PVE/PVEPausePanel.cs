using System.Collections;
using System.Collections.Generic;
using Easy;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class PVEPausePanel : BaseDialogUI
{

    public GameObject btn => gameObject.GetComponent<Properties>().GetObj<GameObject>("Btn");
    public Transform layout => gameObject.GetComponent<Properties>().GetObj<Transform>("Layout");
    public Button btnContinue;
    public Button btnConcede;
    public Button btnStopStep;
    public Button btnManualScore;

    private PVE board;
    public override void OnStart()
    {

        btnContinue = GameObject.Instantiate(btn, layout, false).GetComponentInChildren<Button>();
        btnContinue.transform.Find("Text").GetComponent<Text>().text = "继续(ECS)";

        btnConcede = GameObject.Instantiate(btn, layout, false).GetComponent<Button>();
        btnConcede.transform.Find("txt").GetComponent<Text>().text = "认输";

        btnManualScore = GameObject.Instantiate(btn, layout, false).GetComponent<Button>();
        btnManualScore.transform.Find("txt").GetComponent<Text>().text = "数子";

        btnStopStep = GameObject.Instantiate(btn, layout, false).GetComponentInChildren<Button>();
        btnStopStep.transform.Find("Text").GetComponent<Text>().text = "停一手";



        board = UIMgr.Instance.GetLayer<GameLayer>().GetView<PVE>();
        btnContinue.onClick.AddListener(() =>
        {
            
            Close();
            board.DelayCanPlay().Trigger();
        });

        btnConcede.onClick.AddListener(() =>
        {
            Close();
            board.Resign().Trigger();
        });

        btnStopStep.onClick.AddListener(() =>
        {
            Close();
            board.Pass().Trigger();
        });

        btnManualScore.onClick.AddListener(() =>
        {
            Close();
            board.ManualScore().Trigger();
        });
    }
}
