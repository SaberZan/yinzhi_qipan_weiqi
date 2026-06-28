using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class TextStep : MonoBehaviour
{
    public Text textStep;

    //bool��Ҫ��ʲô��ɫ���� true��ɫ false��ɫ
    public void InitText(int _step, bool color, Vector3 position, float scale)
    {
        textStep.text = _step.ToString();
        textStep.color = color == true ? Color.black : Color.white;
        this.transform.position = position;
        this.transform.localScale = new Vector3(scale, scale, 1);
    }
}
