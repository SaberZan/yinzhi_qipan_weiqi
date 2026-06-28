using System.Collections.Generic;
public class AOTGenericReferences : UnityEngine.MonoBehaviour
{

	// {{ AOT assemblies
	public static readonly IReadOnlyList<string> PatchedAOTAssemblyList = new List<string>
	{
		"EasyFramework.Main.dll",
		"Newtonsoft.Json.dll",
		"SQLite4Unity.dll",
		"System.Core.dll",
		"Toolbox.dll",
		"UnityEngine.AndroidJNIModule.dll",
		"UnityEngine.CoreModule.dll",
		"UnityEngine.JSONSerializeModule.dll",
		"mscorlib.dll",
	};
	// }}

	// {{ constraint implement type
	// }} 

	// {{ AOT generic types
	// Easy.EasyAsyncGenericTaskMethodBuider<object>
	// Easy.EasyTask<object>
	// Easy.ISingleUnityAssetHandle<object>
	// Easy.OrderIndexAttribute.<>c__DisplayClass2_0<object>
	// Easy.SerializableDictionary<object,object>
	// Easy.SerializableDictionaryBase<object,object,object>
	// Google.FlatBuffers.Offset<CfgSpace.BoolArray>
	// Google.FlatBuffers.Offset<CfgSpace.FloatArray>
	// Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>
	// Google.FlatBuffers.Offset<CfgSpace.GameConstCfgs>
	// Google.FlatBuffers.Offset<CfgSpace.IntArray>
	// Google.FlatBuffers.Offset<CfgSpace.StringArray>
	// SQLite.AsyncTableQuery.<>c__DisplayClass14_0<object>
	// SQLite.AsyncTableQuery.<>c__DisplayClass15_0<object>
	// SQLite.AsyncTableQuery.<>c__DisplayClass18_0<object>
	// SQLite.AsyncTableQuery.<>c__DisplayClass19_0<object>
	// SQLite.AsyncTableQuery.<>c__DisplayClass20_0<object>
	// SQLite.AsyncTableQuery<object>
	// SQLite.SQLiteAsyncConnection.<>c__DisplayClass32_0<object>
	// SQLite.SQLiteAsyncConnection.<>c__DisplayClass74_0<object>
	// SQLite.TableQuery.<>c<object>
	// SQLite.TableQuery.CompileResult<object>
	// SQLite.TableQuery<object>
	// System.Action<Stone>
	// System.Action<TextPro.SpriteInfo>
	// System.Action<UnityEngine.Rect>
	// System.Action<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Action<byte>
	// System.Action<float>
	// System.Action<int>
	// System.Action<object,object>
	// System.Action<object>
	// System.ArraySegment.Enumerator<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>
	// System.ArraySegment.Enumerator<Google.FlatBuffers.StringOffset>
	// System.ArraySegment.Enumerator<byte>
	// System.ArraySegment.Enumerator<float>
	// System.ArraySegment.Enumerator<int>
	// System.ArraySegment.Enumerator<ushort>
	// System.ArraySegment<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>
	// System.ArraySegment<Google.FlatBuffers.StringOffset>
	// System.ArraySegment<byte>
	// System.ArraySegment<float>
	// System.ArraySegment<int>
	// System.ArraySegment<ushort>
	// System.ByReference<ushort>
	// System.Collections.Concurrent.ConcurrentQueue.<Enumerate>d__28<object>
	// System.Collections.Concurrent.ConcurrentQueue.Segment<object>
	// System.Collections.Concurrent.ConcurrentQueue<object>
	// System.Collections.Concurrent.ConcurrentStack.<GetEnumerator>d__35<object>
	// System.Collections.Concurrent.ConcurrentStack.Node<object>
	// System.Collections.Concurrent.ConcurrentStack<object>
	// System.Collections.Generic.ArraySortHelper<Stone>
	// System.Collections.Generic.ArraySortHelper<TextPro.SpriteInfo>
	// System.Collections.Generic.ArraySortHelper<UnityEngine.Rect>
	// System.Collections.Generic.ArraySortHelper<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.ArraySortHelper<float>
	// System.Collections.Generic.ArraySortHelper<int>
	// System.Collections.Generic.ArraySortHelper<object>
	// System.Collections.Generic.Comparer<Stone>
	// System.Collections.Generic.Comparer<TextPro.SpriteInfo>
	// System.Collections.Generic.Comparer<UnityEngine.Rect>
	// System.Collections.Generic.Comparer<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.Comparer<float>
	// System.Collections.Generic.Comparer<int>
	// System.Collections.Generic.Comparer<object>
	// System.Collections.Generic.Dictionary.Enumerator<int,object>
	// System.Collections.Generic.Dictionary.Enumerator<long,object>
	// System.Collections.Generic.Dictionary.Enumerator<object,int>
	// System.Collections.Generic.Dictionary.Enumerator<object,object>
	// System.Collections.Generic.Dictionary.KeyCollection.Enumerator<int,object>
	// System.Collections.Generic.Dictionary.KeyCollection.Enumerator<long,object>
	// System.Collections.Generic.Dictionary.KeyCollection.Enumerator<object,int>
	// System.Collections.Generic.Dictionary.KeyCollection.Enumerator<object,object>
	// System.Collections.Generic.Dictionary.KeyCollection<int,object>
	// System.Collections.Generic.Dictionary.KeyCollection<long,object>
	// System.Collections.Generic.Dictionary.KeyCollection<object,int>
	// System.Collections.Generic.Dictionary.KeyCollection<object,object>
	// System.Collections.Generic.Dictionary.ValueCollection.Enumerator<int,object>
	// System.Collections.Generic.Dictionary.ValueCollection.Enumerator<long,object>
	// System.Collections.Generic.Dictionary.ValueCollection.Enumerator<object,int>
	// System.Collections.Generic.Dictionary.ValueCollection.Enumerator<object,object>
	// System.Collections.Generic.Dictionary.ValueCollection<int,object>
	// System.Collections.Generic.Dictionary.ValueCollection<long,object>
	// System.Collections.Generic.Dictionary.ValueCollection<object,int>
	// System.Collections.Generic.Dictionary.ValueCollection<object,object>
	// System.Collections.Generic.Dictionary<int,object>
	// System.Collections.Generic.Dictionary<long,object>
	// System.Collections.Generic.Dictionary<object,int>
	// System.Collections.Generic.Dictionary<object,object>
	// System.Collections.Generic.EqualityComparer<int>
	// System.Collections.Generic.EqualityComparer<long>
	// System.Collections.Generic.EqualityComparer<object>
	// System.Collections.Generic.ICollection<Stone>
	// System.Collections.Generic.ICollection<System.Collections.Generic.KeyValuePair<int,object>>
	// System.Collections.Generic.ICollection<System.Collections.Generic.KeyValuePair<long,object>>
	// System.Collections.Generic.ICollection<System.Collections.Generic.KeyValuePair<object,int>>
	// System.Collections.Generic.ICollection<System.Collections.Generic.KeyValuePair<object,object>>
	// System.Collections.Generic.ICollection<TextPro.SpriteInfo>
	// System.Collections.Generic.ICollection<UnityEngine.Rect>
	// System.Collections.Generic.ICollection<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.ICollection<UnityEngine.UIVertex>
	// System.Collections.Generic.ICollection<float>
	// System.Collections.Generic.ICollection<int>
	// System.Collections.Generic.ICollection<object>
	// System.Collections.Generic.ICollection<ushort>
	// System.Collections.Generic.IComparer<Stone>
	// System.Collections.Generic.IComparer<TextPro.SpriteInfo>
	// System.Collections.Generic.IComparer<UnityEngine.Rect>
	// System.Collections.Generic.IComparer<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.IComparer<float>
	// System.Collections.Generic.IComparer<int>
	// System.Collections.Generic.IComparer<object>
	// System.Collections.Generic.IEnumerable<Stone>
	// System.Collections.Generic.IEnumerable<System.Collections.Generic.KeyValuePair<int,object>>
	// System.Collections.Generic.IEnumerable<System.Collections.Generic.KeyValuePair<long,object>>
	// System.Collections.Generic.IEnumerable<System.Collections.Generic.KeyValuePair<object,int>>
	// System.Collections.Generic.IEnumerable<System.Collections.Generic.KeyValuePair<object,object>>
	// System.Collections.Generic.IEnumerable<TextPro.SpriteInfo>
	// System.Collections.Generic.IEnumerable<UnityEngine.Rect>
	// System.Collections.Generic.IEnumerable<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.IEnumerable<float>
	// System.Collections.Generic.IEnumerable<int>
	// System.Collections.Generic.IEnumerable<object>
	// System.Collections.Generic.IEnumerable<ushort>
	// System.Collections.Generic.IEnumerator<Stone>
	// System.Collections.Generic.IEnumerator<System.Collections.Generic.KeyValuePair<int,object>>
	// System.Collections.Generic.IEnumerator<System.Collections.Generic.KeyValuePair<long,object>>
	// System.Collections.Generic.IEnumerator<System.Collections.Generic.KeyValuePair<object,int>>
	// System.Collections.Generic.IEnumerator<System.Collections.Generic.KeyValuePair<object,object>>
	// System.Collections.Generic.IEnumerator<TextPro.SpriteInfo>
	// System.Collections.Generic.IEnumerator<UnityEngine.Rect>
	// System.Collections.Generic.IEnumerator<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.IEnumerator<float>
	// System.Collections.Generic.IEnumerator<int>
	// System.Collections.Generic.IEnumerator<object>
	// System.Collections.Generic.IEnumerator<ushort>
	// System.Collections.Generic.IEqualityComparer<int>
	// System.Collections.Generic.IEqualityComparer<long>
	// System.Collections.Generic.IEqualityComparer<object>
	// System.Collections.Generic.IList<Stone>
	// System.Collections.Generic.IList<TextPro.SpriteInfo>
	// System.Collections.Generic.IList<UnityEngine.Rect>
	// System.Collections.Generic.IList<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.IList<UnityEngine.UIVertex>
	// System.Collections.Generic.IList<float>
	// System.Collections.Generic.IList<int>
	// System.Collections.Generic.IList<object>
	// System.Collections.Generic.KeyValuePair<int,object>
	// System.Collections.Generic.KeyValuePair<long,object>
	// System.Collections.Generic.KeyValuePair<object,int>
	// System.Collections.Generic.KeyValuePair<object,object>
	// System.Collections.Generic.List.Enumerator<Stone>
	// System.Collections.Generic.List.Enumerator<TextPro.SpriteInfo>
	// System.Collections.Generic.List.Enumerator<UnityEngine.Rect>
	// System.Collections.Generic.List.Enumerator<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.List.Enumerator<float>
	// System.Collections.Generic.List.Enumerator<int>
	// System.Collections.Generic.List.Enumerator<object>
	// System.Collections.Generic.List<Stone>
	// System.Collections.Generic.List<TextPro.SpriteInfo>
	// System.Collections.Generic.List<UnityEngine.Rect>
	// System.Collections.Generic.List<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.List<float>
	// System.Collections.Generic.List<int>
	// System.Collections.Generic.List<object>
	// System.Collections.Generic.ObjectComparer<Stone>
	// System.Collections.Generic.ObjectComparer<TextPro.SpriteInfo>
	// System.Collections.Generic.ObjectComparer<UnityEngine.Rect>
	// System.Collections.Generic.ObjectComparer<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.Generic.ObjectComparer<float>
	// System.Collections.Generic.ObjectComparer<int>
	// System.Collections.Generic.ObjectComparer<object>
	// System.Collections.Generic.ObjectEqualityComparer<int>
	// System.Collections.Generic.ObjectEqualityComparer<long>
	// System.Collections.Generic.ObjectEqualityComparer<object>
	// System.Collections.Generic.Queue.Enumerator<object>
	// System.Collections.Generic.Queue<object>
	// System.Collections.Generic.Stack.Enumerator<object>
	// System.Collections.Generic.Stack<object>
	// System.Collections.ObjectModel.ReadOnlyCollection<Stone>
	// System.Collections.ObjectModel.ReadOnlyCollection<TextPro.SpriteInfo>
	// System.Collections.ObjectModel.ReadOnlyCollection<UnityEngine.Rect>
	// System.Collections.ObjectModel.ReadOnlyCollection<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Collections.ObjectModel.ReadOnlyCollection<float>
	// System.Collections.ObjectModel.ReadOnlyCollection<int>
	// System.Collections.ObjectModel.ReadOnlyCollection<object>
	// System.Comparison<Stone>
	// System.Comparison<TextPro.SpriteInfo>
	// System.Comparison<UnityEngine.Rect>
	// System.Comparison<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Comparison<float>
	// System.Comparison<int>
	// System.Comparison<object>
	// System.Func<byte>
	// System.Func<int>
	// System.Func<object,byte>
	// System.Func<object,int>
	// System.Func<object,object,object>
	// System.Func<object,object>
	// System.Func<object>
	// System.Func<ushort,byte>
	// System.Linq.Buffer<object>
	// System.Linq.Buffer<ushort>
	// System.Linq.Enumerable.<CastIterator>d__99<object>
	// System.Linq.Enumerable.<ReverseIterator>d__79<ushort>
	// System.Linq.Enumerable.<SelectManyIterator>d__23<object,object,object>
	// System.Linq.Enumerable.Iterator<object>
	// System.Linq.Enumerable.WhereArrayIterator<object>
	// System.Linq.Enumerable.WhereEnumerableIterator<object>
	// System.Linq.Enumerable.WhereListIterator<object>
	// System.Linq.Enumerable.WhereSelectArrayIterator<object,object>
	// System.Linq.Enumerable.WhereSelectEnumerableIterator<object,object>
	// System.Linq.Enumerable.WhereSelectListIterator<object,object>
	// System.Nullable<CfgSpace.GameConstCfg>
	// System.Nullable<System.DateTimeOffset>
	// System.Nullable<UnityEngine.Vector2Int>
	// System.Nullable<int>
	// System.Predicate<Stone>
	// System.Predicate<TextPro.SpriteInfo>
	// System.Predicate<UnityEngine.Rect>
	// System.Predicate<UnityEngine.SerializedDictionary.KeyValuePair<object,object>>
	// System.Predicate<float>
	// System.Predicate<int>
	// System.Predicate<object>
	// System.ReadOnlySpan.Enumerator<ushort>
	// System.ReadOnlySpan<ushort>
	// System.Runtime.CompilerServices.ConfiguredTaskAwaitable.ConfiguredTaskAwaiter<int>
	// System.Runtime.CompilerServices.ConfiguredTaskAwaitable.ConfiguredTaskAwaiter<object>
	// System.Runtime.CompilerServices.ConfiguredTaskAwaitable<int>
	// System.Runtime.CompilerServices.ConfiguredTaskAwaitable<object>
	// System.Runtime.CompilerServices.TaskAwaiter<int>
	// System.Runtime.CompilerServices.TaskAwaiter<object>
	// System.Span<ushort>
	// System.Threading.Tasks.ContinuationTaskFromResultTask<int>
	// System.Threading.Tasks.ContinuationTaskFromResultTask<object>
	// System.Threading.Tasks.Task<int>
	// System.Threading.Tasks.Task<object>
	// System.Threading.Tasks.TaskFactory.<>c__DisplayClass35_0<int>
	// System.Threading.Tasks.TaskFactory.<>c__DisplayClass35_0<object>
	// System.Threading.Tasks.TaskFactory<int>
	// System.Threading.Tasks.TaskFactory<object>
	// System.Tuple<int,int>
	// UnityEngine.Events.InvokableCall<UnityEngine.Vector2>
	// UnityEngine.Events.InvokableCall<byte>
	// UnityEngine.Events.InvokableCall<object>
	// UnityEngine.Events.UnityAction<UnityEngine.SceneManagement.Scene,int>
	// UnityEngine.Events.UnityAction<UnityEngine.Vector2>
	// UnityEngine.Events.UnityAction<byte>
	// UnityEngine.Events.UnityAction<object>
	// UnityEngine.Events.UnityEvent<UnityEngine.Vector2>
	// UnityEngine.Events.UnityEvent<byte>
	// UnityEngine.Events.UnityEvent<object>
	// UnityEngine.SerializedDictionary.KeyValuePair<object,object>
	// UnityEngine.SerializedDictionary<object,object>
	// }}

	public void RefMethods()
	{
		// Easy.ISingleUnityAssetHandle<object> Easy.AssetsLoader.LoadUnityAssetByPath<object>(string)
		// Easy.IMultiUnityAssetHandle Easy.AssetsLoader.LoadUnityAssetsByPaths<object>(System.Collections.Generic.IEnumerable<string>)
		// Easy.ISingleUnityAssetHandle<object> Easy.AssetsMgr.LoadAsset<object>(string)
		// Easy.IMultiUnityAssetHandle Easy.AssetsMgr.LoadAssetsByPath<object>(System.Collections.Generic.IEnumerable<string>)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter,WsNetwork.NetworkChild.<AsyncConnectCallback>d__9>(System.Runtime.CompilerServices.TaskAwaiter&,WsNetwork.NetworkChild.<AsyncConnectCallback>d__9&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter,WsNetwork.NetworkChild.<Connect>d__8>(System.Runtime.CompilerServices.TaskAwaiter&,WsNetwork.NetworkChild.<Connect>d__8&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter,WsNetwork.NetworkChild.<DisConnect>d__6>(System.Runtime.CompilerServices.TaskAwaiter&,WsNetwork.NetworkChild.<DisConnect>d__6&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter<int>,Easy.SqliteMgr.<Drop>d__12<object>>(System.Runtime.CompilerServices.TaskAwaiter<int>&,Easy.SqliteMgr.<Drop>d__12<object>&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter<object>,Easy.SqliteMgr.<Drop>d__12<object>>(System.Runtime.CompilerServices.TaskAwaiter<object>&,Easy.SqliteMgr.<Drop>d__12<object>&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,NetMgr.<ConnectSvr>d__11>(object&,NetMgr.<ConnectSvr>d__11&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,NetMgr.<DisConnect>d__16>(object&,NetMgr.<DisConnect>d__16&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,NetMgr.<Start>d__9>(object&,NetMgr.<Start>d__9&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,OnLineKatago.<InitGame>d__2>(object&,OnLineKatago.<InitGame>d__2&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,OnLineKatago.<Resign>d__5>(object&,OnLineKatago.<Resign>d__5&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,OnLineKatago.<Start>d__0>(object&,OnLineKatago.<Start>d__0&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,WsNetwork.<Connect>d__15>(object&,WsNetwork.<Connect>d__15&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,WsNetwork.<DisConnect>d__14>(object&,WsNetwork.<DisConnect>d__14&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,WsNetwork.NetworkChild.<Connect>d__8>(object&,WsNetwork.NetworkChild.<Connect>d__8&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.AwaitUnsafeOnCompleted<object,WsNetwork.NetworkChild.<DisConnect>d__6>(object&,WsNetwork.NetworkChild.<DisConnect>d__6&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<Easy.SqliteMgr.<Drop>d__12<object>>(Easy.SqliteMgr.<Drop>d__12<object>&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<NetMgr.<ConnectSvr>d__11>(NetMgr.<ConnectSvr>d__11&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<NetMgr.<DisConnect>d__16>(NetMgr.<DisConnect>d__16&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<NetMgr.<Start>d__9>(NetMgr.<Start>d__9&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<OnLineKatago.<Close>d__1>(OnLineKatago.<Close>d__1&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<OnLineKatago.<InitGame>d__2>(OnLineKatago.<InitGame>d__2&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<OnLineKatago.<Resign>d__5>(OnLineKatago.<Resign>d__5&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<OnLineKatago.<Start>d__0>(OnLineKatago.<Start>d__0&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<TcpNetwork.NetworkChild.<Connect>d__7>(TcpNetwork.NetworkChild.<Connect>d__7&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<WsNetwork.<Connect>d__15>(WsNetwork.<Connect>d__15&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<WsNetwork.<DisConnect>d__14>(WsNetwork.<DisConnect>d__14&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<WsNetwork.NetworkChild.<AsyncConnectCallback>d__9>(WsNetwork.NetworkChild.<AsyncConnectCallback>d__9&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<WsNetwork.NetworkChild.<Connect>d__8>(WsNetwork.NetworkChild.<Connect>d__8&)
		// System.Void Easy.EasyAsyncEmptyTaskMethodBuider.Start<WsNetwork.NetworkChild.<DisConnect>d__6>(WsNetwork.NetworkChild.<DisConnect>d__6&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter<object>,Easy.SqliteMgr.<GetTable>d__9<object>>(System.Runtime.CompilerServices.TaskAwaiter<object>&,Easy.SqliteMgr.<GetTable>d__9<object>&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter<object>,Easy.SqliteMgr.<GetTableMapping>d__8<object>>(System.Runtime.CompilerServices.TaskAwaiter<object>&,Easy.SqliteMgr.<GetTableMapping>d__8<object>&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.AwaitUnsafeOnCompleted<object,OnLineKatago.<Genmove>d__3>(object&,OnLineKatago.<Genmove>d__3&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.AwaitUnsafeOnCompleted<object,OnLineKatago.<ManualScore>d__6>(object&,OnLineKatago.<ManualScore>d__6&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.AwaitUnsafeOnCompleted<object,OnLineKatago.<Play>d__4>(object&,OnLineKatago.<Play>d__4&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.Start<Easy.SqliteMgr.<GetTable>d__9<object>>(Easy.SqliteMgr.<GetTable>d__9<object>&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.Start<Easy.SqliteMgr.<GetTableMapping>d__8<object>>(Easy.SqliteMgr.<GetTableMapping>d__8<object>&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.Start<OnLineKatago.<Genmove>d__3>(OnLineKatago.<Genmove>d__3&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.Start<OnLineKatago.<ManualScore>d__6>(OnLineKatago.<ManualScore>d__6&)
		// System.Void Easy.EasyAsyncGenericTaskMethodBuider<object>.Start<OnLineKatago.<Play>d__4>(OnLineKatago.<Play>d__4&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter<int>,Easy.SqliteMgr.<DeleteTable>d__11<object>>(System.Runtime.CompilerServices.TaskAwaiter<int>&,Easy.SqliteMgr.<DeleteTable>d__11<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter<int>,Easy.SqliteMgr.<InitData>d__7>(System.Runtime.CompilerServices.TaskAwaiter<int>&,Easy.SqliteMgr.<InitData>d__7&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter<int>,Easy.SqliteMgr.<UpdateTable>d__10<object>>(System.Runtime.CompilerServices.TaskAwaiter<int>&,Easy.SqliteMgr.<UpdateTable>d__10<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.FlatBufferConfigLoader.<LoadConfigCacheAsync>d__10<object>>(object&,Easy.FlatBufferConfigLoader.<LoadConfigCacheAsync>d__10<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.FlatBufferConfigLoader.<LoadConfigCacheAsync>d__8>(object&,Easy.FlatBufferConfigLoader.<LoadConfigCacheAsync>d__8&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.FlatBufferConfigLoader.<LoadConfigUnCacheAsync>d__12>(object&,Easy.FlatBufferConfigLoader.<LoadConfigUnCacheAsync>d__12&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.FlatBufferConfigLoader.<LoadConfigUnCacheAsync>d__14<object>>(object&,Easy.FlatBufferConfigLoader.<LoadConfigUnCacheAsync>d__14<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.JsonConfigLoader.<LoadConfigCacheAsync>d__10<object>>(object&,Easy.JsonConfigLoader.<LoadConfigCacheAsync>d__10<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.JsonConfigLoader.<LoadConfigCacheAsync>d__8>(object&,Easy.JsonConfigLoader.<LoadConfigCacheAsync>d__8&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.JsonConfigLoader.<LoadConfigUnCacheAsync>d__12>(object&,Easy.JsonConfigLoader.<LoadConfigUnCacheAsync>d__12&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.JsonConfigLoader.<LoadConfigUnCacheAsync>d__14<object>>(object&,Easy.JsonConfigLoader.<LoadConfigUnCacheAsync>d__14<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,Easy.ToastUILayer.<ShowToast>d__3>(object&,Easy.ToastUILayer.<ShowToast>d__3&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,LoginPanel.<OnClickedLoginIn>d__21>(object&,LoginPanel.<OnClickedLoginIn>d__21&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,NetMgr.<ConnectLater>d__14>(object&,NetMgr.<ConnectLater>d__14&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,PVE.<DelayCanPlay>d__65>(object&,PVE.<DelayCanPlay>d__65&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,PVE.<ManualScore>d__63>(object&,PVE.<ManualScore>d__63&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,PVE.<Pass>d__61>(object&,PVE.<Pass>d__61&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,PVE.<Resign>d__62>(object&,PVE.<Resign>d__62&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,PVE.<ShowChessBoard>d__59>(object&,PVE.<ShowChessBoard>d__59&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,TcpNetwork.<Connect>d__15>(object&,TcpNetwork.<Connect>d__15&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.AwaitUnsafeOnCompleted<object,WsNetwork.NetworkChild.<SocketClose>d__26>(object&,WsNetwork.NetworkChild.<SocketClose>d__26&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.FlatBufferConfigLoader.<LoadConfigCacheAsync>d__10<object>>(Easy.FlatBufferConfigLoader.<LoadConfigCacheAsync>d__10<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.FlatBufferConfigLoader.<LoadConfigCacheAsync>d__8>(Easy.FlatBufferConfigLoader.<LoadConfigCacheAsync>d__8&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.FlatBufferConfigLoader.<LoadConfigUnCacheAsync>d__12>(Easy.FlatBufferConfigLoader.<LoadConfigUnCacheAsync>d__12&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.FlatBufferConfigLoader.<LoadConfigUnCacheAsync>d__14<object>>(Easy.FlatBufferConfigLoader.<LoadConfigUnCacheAsync>d__14<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.JsonConfigLoader.<LoadConfigCacheAsync>d__10<object>>(Easy.JsonConfigLoader.<LoadConfigCacheAsync>d__10<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.JsonConfigLoader.<LoadConfigCacheAsync>d__8>(Easy.JsonConfigLoader.<LoadConfigCacheAsync>d__8&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.JsonConfigLoader.<LoadConfigUnCacheAsync>d__12>(Easy.JsonConfigLoader.<LoadConfigUnCacheAsync>d__12&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.JsonConfigLoader.<LoadConfigUnCacheAsync>d__14<object>>(Easy.JsonConfigLoader.<LoadConfigUnCacheAsync>d__14<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.SqliteMgr.<DeleteTable>d__11<object>>(Easy.SqliteMgr.<DeleteTable>d__11<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.SqliteMgr.<InitData>d__7>(Easy.SqliteMgr.<InitData>d__7&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.SqliteMgr.<UpdateTable>d__10<object>>(Easy.SqliteMgr.<UpdateTable>d__10<object>&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<Easy.ToastUILayer.<ShowToast>d__3>(Easy.ToastUILayer.<ShowToast>d__3&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<LoginPanel.<OnClickedLoginIn>d__21>(LoginPanel.<OnClickedLoginIn>d__21&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<NetMgr.<ConnectLater>d__14>(NetMgr.<ConnectLater>d__14&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<PVE.<DelayCanPlay>d__65>(PVE.<DelayCanPlay>d__65&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<PVE.<ManualScore>d__63>(PVE.<ManualScore>d__63&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<PVE.<Pass>d__61>(PVE.<Pass>d__61&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<PVE.<Resign>d__62>(PVE.<Resign>d__62&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<PVE.<ShowChessBoard>d__59>(PVE.<ShowChessBoard>d__59&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<TcpNetwork.<Connect>d__15>(TcpNetwork.<Connect>d__15&)
		// System.Void Easy.EasyAsyncVoidMethodBuider.Start<WsNetwork.NetworkChild.<SocketClose>d__26>(WsNetwork.NetworkChild.<SocketClose>d__26&)
		// object Easy.EasyFrameworkConfig.GetEasyConfig<object>()
		// object Easy.GameObjectExtension.GetOrAddComponent<object>(UnityEngine.GameObject)
		// bool Easy.GameObjectExtension.HasComponent<object>(UnityEngine.GameObject)
		// System.Collections.Generic.Dictionary<int,System.Collections.Generic.List<object>> Easy.OrderIndexAttribute.GetBatchListByInterval<object>(System.Collections.Generic.List<object>,int)
		// System.Void Easy.OrderIndexAttribute.Sort<object>(System.Collections.Generic.List<object>)
		// object Easy.ProxyMgr.Get<object>()
		// int Google.FlatBuffers.ByteBuffer.ArraySize<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>(System.ArraySegment<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>)
		// int Google.FlatBuffers.ByteBuffer.ArraySize<Google.FlatBuffers.StringOffset>(System.ArraySegment<Google.FlatBuffers.StringOffset>)
		// int Google.FlatBuffers.ByteBuffer.ArraySize<byte>(System.ArraySegment<byte>)
		// int Google.FlatBuffers.ByteBuffer.ArraySize<byte>(byte[])
		// int Google.FlatBuffers.ByteBuffer.ArraySize<float>(System.ArraySegment<float>)
		// int Google.FlatBuffers.ByteBuffer.ArraySize<float>(float[])
		// int Google.FlatBuffers.ByteBuffer.ArraySize<int>(System.ArraySegment<int>)
		// int Google.FlatBuffers.ByteBuffer.ArraySize<int>(int[])
		// bool Google.FlatBuffers.ByteBuffer.IsSupportedType<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>()
		// bool Google.FlatBuffers.ByteBuffer.IsSupportedType<Google.FlatBuffers.StringOffset>()
		// bool Google.FlatBuffers.ByteBuffer.IsSupportedType<byte>()
		// bool Google.FlatBuffers.ByteBuffer.IsSupportedType<float>()
		// bool Google.FlatBuffers.ByteBuffer.IsSupportedType<int>()
		// int Google.FlatBuffers.ByteBuffer.Put<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>(int,System.ArraySegment<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>)
		// int Google.FlatBuffers.ByteBuffer.Put<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>(int,System.IntPtr,int)
		// int Google.FlatBuffers.ByteBuffer.Put<Google.FlatBuffers.StringOffset>(int,System.ArraySegment<Google.FlatBuffers.StringOffset>)
		// int Google.FlatBuffers.ByteBuffer.Put<Google.FlatBuffers.StringOffset>(int,System.IntPtr,int)
		// int Google.FlatBuffers.ByteBuffer.Put<byte>(int,System.ArraySegment<byte>)
		// int Google.FlatBuffers.ByteBuffer.Put<byte>(int,System.IntPtr,int)
		// int Google.FlatBuffers.ByteBuffer.Put<float>(int,System.ArraySegment<float>)
		// int Google.FlatBuffers.ByteBuffer.Put<float>(int,System.IntPtr,int)
		// int Google.FlatBuffers.ByteBuffer.Put<int>(int,System.ArraySegment<int>)
		// int Google.FlatBuffers.ByteBuffer.Put<int>(int,System.IntPtr,int)
		// int Google.FlatBuffers.ByteBuffer.SizeOf<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>()
		// int Google.FlatBuffers.ByteBuffer.SizeOf<Google.FlatBuffers.StringOffset>()
		// int Google.FlatBuffers.ByteBuffer.SizeOf<byte>()
		// int Google.FlatBuffers.ByteBuffer.SizeOf<float>()
		// int Google.FlatBuffers.ByteBuffer.SizeOf<int>()
		// byte[] Google.FlatBuffers.ByteBuffer.ToArray<byte>(int,int)
		// float[] Google.FlatBuffers.ByteBuffer.ToArray<float>(int,int)
		// int[] Google.FlatBuffers.ByteBuffer.ToArray<int>(int,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>(Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>[])
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>(System.ArraySegment<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<Google.FlatBuffers.StringOffset>(Google.FlatBuffers.StringOffset[])
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<Google.FlatBuffers.StringOffset>(System.ArraySegment<Google.FlatBuffers.StringOffset>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<Google.FlatBuffers.StringOffset>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<byte>(System.ArraySegment<byte>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<byte>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<byte>(byte[])
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<float>(System.ArraySegment<float>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<float>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<float>(float[])
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<int>(System.ArraySegment<int>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<int>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Add<int>(int[])
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>(System.ArraySegment<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<Google.FlatBuffers.Offset<CfgSpace.GameConstCfg>>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<Google.FlatBuffers.StringOffset>(System.ArraySegment<Google.FlatBuffers.StringOffset>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<Google.FlatBuffers.StringOffset>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<byte>(System.ArraySegment<byte>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<byte>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<float>(System.ArraySegment<float>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<float>(System.IntPtr,int)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<int>(System.ArraySegment<int>)
		// System.Void Google.FlatBuffers.FlatBufferBuilder.Put<int>(System.IntPtr,int)
		// byte[] Google.FlatBuffers.Table.__vector_as_array<byte>(int)
		// float[] Google.FlatBuffers.Table.__vector_as_array<float>(int)
		// int[] Google.FlatBuffers.Table.__vector_as_array<int>(int)
		// object Newtonsoft.Json.JsonConvert.DeserializeObject<object>(string)
		// object Newtonsoft.Json.JsonConvert.DeserializeObject<object>(string,Newtonsoft.Json.JsonSerializerSettings)
		// System.Threading.Tasks.Task<SQLite.TableMapping> SQLite.SQLiteAsyncConnection.GetMappingAsync<object>(SQLite.CreateFlags)
		// System.Threading.Tasks.Task<object> SQLite.SQLiteAsyncConnection.ReadAsync<object>(System.Func<SQLite.SQLiteConnectionWithLock,object>)
		// SQLite.AsyncTableQuery<object> SQLite.SQLiteAsyncConnection.Table<object>()
		// SQLite.TableQuery<object> SQLite.SQLiteConnection.Table<object>()
		// object System.Activator.CreateInstance<object>()
		// object[] System.Array.Empty<object>()
		// System.Void System.Array.Resize<byte>(byte[]&,int)
		// bool System.Linq.Enumerable.All<ushort>(System.Collections.Generic.IEnumerable<ushort>,System.Func<ushort,bool>)
		// System.Collections.Generic.IEnumerable<object> System.Linq.Enumerable.Cast<object>(System.Collections.IEnumerable)
		// System.Collections.Generic.IEnumerable<object> System.Linq.Enumerable.CastIterator<object>(System.Collections.IEnumerable)
		// int System.Linq.Enumerable.Count<object>(System.Collections.Generic.IEnumerable<object>)
		// System.Collections.Generic.IEnumerable<ushort> System.Linq.Enumerable.Reverse<ushort>(System.Collections.Generic.IEnumerable<ushort>)
		// System.Collections.Generic.IEnumerable<ushort> System.Linq.Enumerable.ReverseIterator<ushort>(System.Collections.Generic.IEnumerable<ushort>)
		// System.Collections.Generic.IEnumerable<object> System.Linq.Enumerable.Select<object,object>(System.Collections.Generic.IEnumerable<object>,System.Func<object,object>)
		// System.Collections.Generic.IEnumerable<object> System.Linq.Enumerable.SelectMany<object,object,object>(System.Collections.Generic.IEnumerable<object>,System.Func<object,System.Collections.Generic.IEnumerable<object>>,System.Func<object,object,object>)
		// System.Collections.Generic.IEnumerable<object> System.Linq.Enumerable.SelectManyIterator<object,object,object>(System.Collections.Generic.IEnumerable<object>,System.Func<object,System.Collections.Generic.IEnumerable<object>>,System.Func<object,object,object>)
		// object[] System.Linq.Enumerable.ToArray<object>(System.Collections.Generic.IEnumerable<object>)
		// ushort[] System.Linq.Enumerable.ToArray<ushort>(System.Collections.Generic.IEnumerable<ushort>)
		// System.Collections.Generic.List<int> System.Linq.Enumerable.ToList<int>(System.Collections.Generic.IEnumerable<int>)
		// System.Collections.Generic.List<object> System.Linq.Enumerable.ToList<object>(System.Collections.Generic.IEnumerable<object>)
		// System.Collections.Generic.IEnumerable<object> System.Linq.Enumerable.Where<object>(System.Collections.Generic.IEnumerable<object>,System.Func<object,bool>)
		// System.Collections.Generic.IEnumerable<object> System.Linq.Enumerable.Iterator<object>.Select<object>(System.Func<object,object>)
		// object System.Reflection.CustomAttributeExtensions.GetCustomAttribute<object>(System.Reflection.MemberInfo)
		// System.Void System.Runtime.CompilerServices.AsyncVoidMethodBuilder.AwaitUnsafeOnCompleted<System.Runtime.CompilerServices.TaskAwaiter<object>,WsNetwork.NetworkChild.<Recive>d__18>(System.Runtime.CompilerServices.TaskAwaiter<object>&,WsNetwork.NetworkChild.<Recive>d__18&)
		// System.Void System.Runtime.CompilerServices.AsyncVoidMethodBuilder.AwaitUnsafeOnCompleted<object,PVE.<<Update>b__56_1>d>(object&,PVE.<<Update>b__56_1>d&)
		// System.Void System.Runtime.CompilerServices.AsyncVoidMethodBuilder.AwaitUnsafeOnCompleted<object,PVE.<<Update>g__genMove|56_0>d>(object&,PVE.<<Update>g__genMove|56_0>d&)
		// System.Void System.Runtime.CompilerServices.AsyncVoidMethodBuilder.Start<LoginPanel.<<OnStart>b__20_0>d>(LoginPanel.<<OnStart>b__20_0>d&)
		// System.Void System.Runtime.CompilerServices.AsyncVoidMethodBuilder.Start<LoginPanel.<>c__DisplayClass21_0.<<OnClickedLoginIn>b__2>d>(LoginPanel.<>c__DisplayClass21_0.<<OnClickedLoginIn>b__2>d&)
		// System.Void System.Runtime.CompilerServices.AsyncVoidMethodBuilder.Start<PVE.<<Update>b__56_1>d>(PVE.<<Update>b__56_1>d&)
		// System.Void System.Runtime.CompilerServices.AsyncVoidMethodBuilder.Start<PVE.<<Update>g__genMove|56_0>d>(PVE.<<Update>g__genMove|56_0>d&)
		// System.Void System.Runtime.CompilerServices.AsyncVoidMethodBuilder.Start<WsNetwork.NetworkChild.<Recive>d__18>(WsNetwork.NetworkChild.<Recive>d__18&)
		// object& System.Runtime.CompilerServices.Unsafe.As<object,object>(object&)
		// System.Void* System.Runtime.CompilerServices.Unsafe.AsPointer<object>(object&)
		// System.Threading.Tasks.Task<object> System.Threading.Tasks.TaskFactory.StartNew<object>(System.Func<object>,System.Threading.CancellationToken,System.Threading.Tasks.TaskCreationOptions,System.Threading.Tasks.TaskScheduler)
		// object UnityEngine.AndroidJNIHelper.ConvertFromJNIArray<object>(System.IntPtr)
		// System.IntPtr UnityEngine.AndroidJNIHelper.GetFieldID<object>(System.IntPtr,string,bool)
		// object UnityEngine.AndroidJavaObject.FromJavaArrayDeleteLocalRef<object>(System.IntPtr)
		// object UnityEngine.AndroidJavaObject.GetStatic<object>(string)
		// object UnityEngine.AndroidJavaObject._GetStatic<object>(System.IntPtr)
		// object UnityEngine.AndroidJavaObject._GetStatic<object>(string)
		// object UnityEngine.Component.GetComponent<object>()
		// object UnityEngine.GameObject.AddComponent<object>()
		// object UnityEngine.GameObject.GetComponent<object>()
		// object UnityEngine.GameObject.GetComponentInChildren<object>()
		// object UnityEngine.GameObject.GetComponentInChildren<object>(bool)
		// object UnityEngine.JsonUtility.FromJson<object>(string)
		// object UnityEngine.Object.FindAnyObjectByType<object>()
		// object UnityEngine.Object.FindObjectOfType<object>()
		// object UnityEngine.Object.Instantiate<object>(object)
		// object UnityEngine.Object.Instantiate<object>(object,UnityEngine.Transform,bool)
		// object UnityEngine._AndroidJNIHelper.ConvertFromJNIArray<object>(System.IntPtr)
		// System.IntPtr UnityEngine._AndroidJNIHelper.GetFieldID<object>(System.IntPtr,string,bool)
		// string string.Join<int>(System.Char,System.Collections.Generic.IEnumerable<int>)
		// string string.JoinCore<int>(System.Char*,int,System.Collections.Generic.IEnumerable<int>)
	}
}