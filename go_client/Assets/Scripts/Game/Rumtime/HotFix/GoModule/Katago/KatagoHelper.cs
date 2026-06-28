using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

public class KatagoHelper
{
    public static IKatago katago;

    public static IKatago CreateKatago<T>(Action<bool> callback) where T : IKatago, new()
    {
        katago = new T();
        katago.Start(callback);
        return katago;
    }

    public static void CloseKatago(Action callback)
    {
        katago?.Close(callback);
    }
}




