# 数据来源与精度

所有随仓库提供的数据均为真实公开数据的快照或转换结果，没有生成虚构城市或地震。

| 内容 | 来源与授权 | 使用方式 / 限制 |
| --- | --- | --- |
| 城市坐标、名字、部分别名、人口排序 | [GeoNames cities15000](https://download.geonames.org/export/dump/) · CC BY 4.0 | `cities.json` 从原始 TSV 提取；记录顺序按人口排列。名称覆盖不等于全球每个村镇。中文候选来自公开别名，可能包含繁体或外文汉字名。 |
| 陆地轮廓 | [Natural Earth ne_50m_land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_land.geojson) · Public domain | `land.geojson` 为 1:50,000,000 概化陆地多边形，适合探索用途。水域判断不能细分具体海洋，也不能可靠识别小岛、近岸和内陆湖泊。当前副本对应上游 Git blob `c412c52b5286ba727dcb7047ecd6080bcbeb8298`。 |
| 概览底图 | Natural Earth II，Cesium 包随附 · Natural Earth Public domain | 默认在本地提供；纹理层级最高 2，深度放大只能放大原图。影像内明暗代表地形晕渲。 |
| 地震 | [USGS GeoJSON feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) | 在线地址 `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson`。失败后读取 `earthquakes-snapshot.geojson`，明确显示快照与数据生成时间。USGS 自有数据通常为公共领域；每条记录附原始事件链接及贡献者信息。 |
| 城市街道 | [OpenStreetMap](https://www.openstreetmap.org/copyright) · ODbL | 仅用户选中时按视野请求公共图块，保留署名。遵循 [图块使用政策](https://operations.osmfoundation.org/policies/tiles/)，不批量下载、不预取、不强制绕过缓存。公共服务器无可用性承诺；规模扩大应更换合适服务或自行托管。 |
| 卫星观测 | [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/) | MODIS Terra Corrected Reflectance True Color / EPSG:4326 / 250m 图层。默认昨日 UTC 日期，可选历史日期。受云、卫星过境、覆盖、处理延迟和服务状况影响；显示影像而非通过颜色反算科学数值。 |
| 距离 | [GeographicLib](https://github.com/geographiclib/geographiclib-js) · MIT | WGS84 椭球测地线。椭球表面最短路径，不包含道路、高程起伏或实际航线。数值按用途取整，算法精度不代表地点坐标精度。 |
| 对跖点 | 数学计算 | 纬度取反，经度加 180° 后归一化。附近城市在当前城市库中查找，不等于最近聚落或具体地址。 |
| 手势模型 | [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) · Apache-2.0 | float16 v1 模型在 `public/models/`。运行资源从 npm 包复制到同源目录；帧在本机识别。模型和手势状态算法可能误判，需实机调校。 |

## 来源时间

`public/data/manifest.json` 保留检索时间、记录数、USGS 数据生成时间以及原始来源链接。检索时间不是卫星拍摄时间，也不是地震发生时间。页面中事件和更新时间标为北京时间；卫星选图日期使用 UTC。

## 科学表达

页面明确区分真实观测记录、基于坐标的计算结果、底图及视觉标记。震级不是某地的烈度或损害；海拔与地球内部结构第一版未提供。无数据时不生成占位数值冒充观测。
