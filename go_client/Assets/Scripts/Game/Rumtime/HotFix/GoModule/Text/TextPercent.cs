using System.Collections;
using System.Collections.Generic;
using UnityEngine.UI;
using UnityEngine;

public class TextPercent : MonoBehaviour
{
    public Text textPercent;

    public void InitText(double value, Vector3 position, float scale)
    {
        textPercent.text = Mathf.RoundToInt((float)value).ToString();
        this.transform.position = position;
        this.transform.localScale = new Vector3(scale, scale, 1);
    }
}
