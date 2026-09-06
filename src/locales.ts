// Columns: source key, Traditional Chinese, Japanese, Korean, German, French, Spanish.
const rows = `搜索笔记|搜尋筆記|ノートを検索|노트 검색|Notizen suchen|Rechercher des notes|Buscar notas
解除关联|解除關聯|リンクを解除|연결 해제|Verknüpfung lösen|Dissocier|Desvincular
模板|範本|テンプレート|템플릿|Vorlage|Modèle|Plantilla
轻量模板|精簡範本|シンプルなテンプレート|간단한 템플릿|Einfache Vorlage|Modèle simple|Plantilla sencilla
新活动|新活動|新しいアクティビティ|새 활동|Neue Aktivität|Nouvelle activité|Nueva actividad
Enter 保存 · Esc 取消|Enter 儲存 · Esc 取消|Enter で保存 · Esc でキャンセル|Enter 저장 · Esc 취소|Enter speichern · Esc abbrechen|Entrée enregistrer · Échap annuler|Enter guardar · Esc cancelar
文件名|檔案名稱|ファイル名|파일 이름|Dateiname|Nom du fichier|Nombre del archivo
新建故事地图|新增故事地圖|ストーリーマップを作成|스토리 맵 만들기|Neue Story Map|Nouvelle carte de récits|Nuevo mapa de historias
地图管理|地圖管理|マップ管理|지도 관리|Maps verwalten|Gérer les cartes|Gestionar mapas
新建空白地图|新增空白地圖|空のマップを作成|빈 지도 만들기|Neue leere Map|Nouvelle carte vide|Nuevo mapa vacío
从示例新建|從範例新增|サンプルから作成|예제로 만들기|Aus Beispiel erstellen|Créer depuis un exemple|Crear desde ejemplo
复制当前地图|複製目前地圖|現在のマップを複製|현재 지도 복제|Aktuelle Map duplizieren|Dupliquer la carte|Duplicar mapa actual
已归档|已封存|アーカイブ済み|보관됨|Archiviert|Archivée|Archivado
恢复地图|還原地圖|マップを復元|지도 복원|Map wiederherstellen|Restaurer la carte|Restaurar mapa
归档地图|封存地圖|マップをアーカイブ|지도 보관|Map archivieren|Archiver la carte|Archivar mapa
打开|開啟|開く|열기|Öffnen|Ouvrir|Abrir
保存位置|儲存位置|保存先|저장 위치|Speicherort|Emplacement|Ubicación
系统另存为（桌面、下载或其他目录）|系統另存新檔（桌面、下載或其他目錄）|システムの名前を付けて保存（デスクトップなど）|시스템 다른 이름으로 저장 (바탕화면 등)|Systemdialog (Desktop, Downloads oder anderer Ordner)|Dialogue système (Bureau, Téléchargements ou autre dossier)|Diálogo del sistema (Escritorio, Descargas u otra carpeta)
Obsidian 库内导出文件夹|Obsidian 庫內匯出資料夾|Obsidian 保管庫内の出力フォルダー|Obsidian 보관함 내 내보내기 폴더|Exportordner im Obsidian-Vault|Dossier d’export dans le coffre Obsidian|Carpeta de exportación en la bóveda Obsidian
系统窗口可修改文件名和位置，并记住上次选择的目录；覆盖已有文件前会询问。|系統視窗可修改檔名與位置，並記住上次選擇的目錄；覆寫現有檔案前會詢問。|システム画面で名前と保存先を変更できます。前回のフォルダーを記憶し、上書き前に確認します。|시스템 창에서 이름과 위치를 변경할 수 있습니다. 마지막 폴더를 기억하고 덮어쓰기 전에 확인합니다.|Im Systemdialog können Name und Ort geändert werden. Er merkt sich den letzten Ordner und fragt vor dem Überschreiben.|Le dialogue système permet de changer le nom et l’emplacement, mémorise le dernier dossier et confirme tout remplacement.|El diálogo permite cambiar nombre y ubicación, recuerda la última carpeta y confirma antes de reemplazar archivos.
导出|匯出|エクスポート|내보내기|Exportieren|Exporter|Exportar
导出地图|匯出地圖|マップをエクスポート|지도 내보내기|Map exportieren|Exporter la carte|Exportar mapa
导出格式|匯出格式|出力形式|내보내기 형식|Exportformat|Format d’export|Formato de exportación
正在导出…|正在匯出…|エクスポート中…|내보내는 중…|Wird exportiert…|Export en cours…|Exportando…
已导出：{0}|已匯出：{0}|出力しました：{0}|내보내기 완료: {0}|Exportiert: {0}|Exporté : {0}|Exportado: {0}
导出失败：{0}|匯出失敗：{0}|出力に失敗：{0}|내보내기 실패: {0}|Export fehlgeschlagen: {0}|Échec de l’export : {0}|Error al exportar: {0}
PNG：完整地图图片，适合分享和插入文档。|PNG：完整地圖圖片，適合分享與插入文件。|PNG：共有や文書への挿入に適したマップ全体の画像。|PNG: 공유 및 문서 삽입용 전체 지도 이미지.|PNG: Vollständige Map als Bild zum Teilen und Einfügen in Dokumente.|PNG : image de la carte complète à partager ou à insérer dans un document.|PNG: imagen del mapa completo para compartir o insertar en documentos.
PDF：单页地图图片，适合分享和打印，文字不可搜索。|PDF：單頁地圖圖片，適合分享與列印，文字無法搜尋。|PDF：共有・印刷用の1ページのマップ画像。文字検索はできません。|PDF: 공유 및 인쇄용 단일 페이지 지도 이미지. 텍스트 검색은 불가능합니다.|PDF: Einseitiges Map-Bild zum Teilen und Drucken. Text ist nicht durchsuchbar.|PDF : image de la carte sur une page, à partager ou imprimer. Texte non recherchable.|PDF: imagen del mapa en una página para compartir e imprimir. Texto no buscable.
XMind：可继续编辑的脑图，包含用户旅程、里程碑和角色。|XMind：可繼續編輯的心智圖，包含使用者旅程、里程碑與角色。|XMind：ユーザージャーニー、マイルストーン、ロールを含む編集可能なマインドマップ。|XMind: 사용자 여정, 마일스톤, 역할이 포함된 편집 가능한 마인드맵.|XMind: Bearbeitbare Mindmap mit Nutzerreise, Meilensteinen und Rollen.|XMind : carte mentale modifiable avec parcours utilisateur, jalons et rôles.|XMind: mapa mental editable con recorrido del usuario, hitos y roles.
JSON：完整地图数据备份；暂不提供导入界面。|JSON：完整地圖資料備份；暫不提供匯入介面。|JSON：マップデータの完全バックアップ。インポート画面は未対応です。|JSON: 전체 지도 데이터 백업. 가져오기 화면은 아직 제공되지 않습니다.|JSON: Vollständige Datensicherung. Eine Importoberfläche ist noch nicht verfügbar.|JSON : sauvegarde complète des données. Interface d’import non disponible pour le moment.|JSON: copia completa de los datos. La interfaz de importación aún no está disponible.
导出完整地图，不受搜索、筛选或缩放影响。|匯出完整地圖，不受搜尋、篩選或縮放影響。|検索・フィルター・ズームに関係なくマップ全体を出力します。|검색, 필터, 확대 비율과 무관하게 전체 지도를 내보냅니다.|Exportiert die gesamte Map unabhängig von Suche, Filtern oder Zoom.|Exporte toute la carte, indépendamment de la recherche, des filtres ou du zoom.|Exporta el mapa completo sin aplicar búsquedas, filtros ni zoom.
保存到库内文件夹：{0}，同名文件自动编号。|儲存至庫內資料夾：{0}，同名檔案自動編號。|保管庫内の {0} に保存。同名ファイルは連番で保持します。|보관함 폴더 {0}에 저장합니다. 동일한 이름은 번호를 붙여 보존합니다.|Speichert im Vault-Ordner {0}. Gleichnamige Dateien werden durch Nummerierung erhalten.|Enregistre dans le dossier {0} du coffre. Les fichiers existants sont préservés par numérotation.|Guarda en la carpeta {0} de la bóveda. Los archivos existentes se conservan mediante numeración.
无法创建导出画布|無法建立匯出畫布|出力キャンバスを作成できません|내보내기 캔버스를 만들 수 없습니다|Exportfläche konnte nicht erstellt werden|Impossible de créer le canevas d’export|No se pudo crear el lienzo de exportación
地图过大，请选择 XMind 或 JSON 导出|地圖過大，請選擇 XMind 或 JSON 匯出|マップが大きすぎます。XMind または JSON を選択してください|지도가 너무 큽니다. XMind 또는 JSON을 선택하세요|Map zu groß. Bitte XMind oder JSON wählen|Carte trop grande. Choisissez XMind ou JSON|Mapa demasiado grande. Elige XMind o JSON
图像生成失败|圖片產生失敗|画像生成に失敗しました|이미지 생성 실패|Bilderzeugung fehlgeschlagen|Échec de la création de l’image|Error al generar la imagen
不支持的导出格式|不支援的匯出格式|未対応の出力形式|지원하지 않는 내보내기 형식|Nicht unterstütztes Exportformat|Format d’export non pris en charge|Formato de exportación no compatible
故事|故事|ストーリー|스토리|Story|Story|Historia
想法|想法|アイデア|아이디어|Idee|Idée|Idea
已规划|已規劃|計画済み|계획됨|Geplant|Planifié|Planificada
进行中|進行中|進行中|진행 중|In Arbeit|En cours|En curso
已完成|已完成|完了|완료|Erledigt|Terminé|Completada
低|低|低|낮음|Niedrig|Faible|Baja
中|中|中|보통|Mittel|Moyenne|Media
高|高|高|높음|Hoch|Élevée|Alta
取消|取消|キャンセル|취소|Abbrechen|Annuler|Cancelar
保存|儲存|保存|저장|Speichern|Enregistrer|Guardar
添加 Activity|新增 Activity|アクティビティを追加|활동 추가|Aktivität hinzufügen|Ajouter une activité|Añadir actividad
Activity 名称|Activity 名稱|アクティビティ名|활동 이름|Aktivitätsname|Nom de l’activité|Nombre de la actividad
例如：进入系统|例如：進入系統|例：システムへのアクセス|예: 시스템 접속|z. B. Systemzugang|Ex. : accéder au système|Ej.: acceder al sistema
第一个 Task|第一個 Task|最初のタスク|첫 번째 작업|Erste Aufgabe|Première tâche|Primera tarea
例如：注册账号|例如：註冊帳號|例：アカウントの作成|예: 계정 만들기|z. B. Konto erstellen|Ex. : créer un compte|Ej.: crear una cuenta
创建|建立|作成|만들기|Erstellen|Créer|Crear
角色管理|角色管理|ロール管理|역할 관리|Rollen verwalten|Gérer les rôles|Gestionar roles
角色属于整张地图，可分配给任意用户故事。|角色屬於整張地圖，每個故事可指定一個角色。|ロールはマップ全体で管理し、各ストーリーに1つ割り当てられます。|역할은 지도 전체에서 관리하며 스토리마다 하나를 지정할 수 있습니다.|Rollen gelten für die gesamte Map. Jede Story kann eine Rolle haben.|Les rôles sont communs à la carte. Chaque story peut avoir un rôle.|Los roles pertenecen al mapa. Cada historia puede tener un rol.
角色名称|角色名稱|ロール名|역할 이름|Rollenname|Nom du rôle|Nombre del rol
角色说明|角色說明|ロールの説明|역할 설명|Rollenbeschreibung|Description du rôle|Descripción del rol
删除|刪除|削除|삭제|Löschen|Supprimer|Eliminar
删除角色 {0}|刪除角色 {0}|ロール {0} を削除|역할 {0} 삭제|Rolle {0} löschen|Supprimer le rôle {0}|Eliminar el rol {0}
未命名角色|未命名角色|無題のロール|이름 없는 역할|Unbenannte Rolle|Rôle sans nom|Rol sin nombre
还没有角色|尚無角色|ロールはまだありません|역할이 없습니다|Noch keine Rollen|Aucun rôle|No hay roles
+ 角色|+ 角色|+ ロール|+ 역할|+ Rolle|+ Rôle|+ Rol
新角色|新角色|新しいロール|새 역할|Neue Rolle|Nouveau rôle|Nuevo rol
完成|完成|完了|완료|Fertig|Terminer|Listo
里程碑管理|里程碑管理|マイルストーン管理|마일스톤 관리|Meilensteine verwalten|Gérer les jalons|Gestionar hitos
里程碑决定 Story 所在的横向发布切片。包含 Story 的里程碑不能删除。|里程碑決定故事所在的橫向發布區段。包含故事的里程碑不能刪除。|マイルストーンはストーリーをリリースごとの横列に分けます。ストーリーがある場合は削除できません。|마일스톤은 스토리를 가로 릴리스 구간으로 나눕니다. 스토리가 있으면 삭제할 수 없습니다.|Meilensteine ordnen Storys in horizontale Release-Bahnen. Meilensteine mit Storys können nicht gelöscht werden.|Les jalons regroupent les stories en lignes de livraison. Un jalon contenant des stories ne peut pas être supprimé.|Los hitos organizan las historias en filas de entrega. No se puede eliminar un hito que contenga historias.
里程碑名称|里程碑名稱|マイルストーン名|마일스톤 이름|Meilensteinname|Nom du jalon|Nombre del hito
说明|說明|説明|설명|Beschreibung|Description|Descripción
里程碑说明|里程碑說明|マイルストーンの説明|마일스톤 설명|Meilensteinbeschreibung|Description du jalon|Descripción del hito
该里程碑包含 {0} 个 Story，不能删除|此里程碑包含 {0} 個故事，不能刪除|ストーリーが {0} 件あるため削除できません|스토리가 {0}개 있어 삭제할 수 없습니다|Enthält {0} Storys; Löschen nicht möglich|Contient {0} stories ; suppression impossible|Contiene {0} historias; no se puede eliminar
删除里程碑 {0}|刪除里程碑 {0}|マイルストーン {0} を削除|마일스톤 {0} 삭제|Meilenstein {0} löschen|Supprimer le jalon {0}|Eliminar el hito {0}
请先将 Story 移动到其他里程碑|請先將故事移至其他里程碑|先にストーリーを別のマイルストーンに移動してください|먼저 스토리를 다른 마일스톤으로 이동하세요|Storys zuerst in einen anderen Meilenstein verschieben|Déplacez d’abord les stories vers un autre jalon|Primero mueve las historias a otro hito
删除里程碑|刪除里程碑|マイルストーンを削除|마일스톤 삭제|Meilenstein löschen|Supprimer le jalon|Eliminar hito
未命名里程碑|未命名里程碑|無題のマイルストーン|이름 없는 마일스톤|Unbenannter Meilenstein|Jalon sans nom|Hito sin nombre
这个里程碑下面还有 Story，不能删除|此里程碑仍有故事，不能刪除|ストーリーがあるマイルストーンは削除できません|스토리가 있는 마일스톤은 삭제할 수 없습니다|Dieser Meilenstein enthält Storys und kann nicht gelöscht werden|Ce jalon contient des stories et ne peut pas être supprimé|Este hito contiene historias y no se puede eliminar
还没有里程碑|尚無里程碑|マイルストーンはまだありません|마일스톤이 없습니다|Noch keine Meilensteine|Aucun jalon|No hay hitos
+ 里程碑|+ 里程碑|+ マイルストーン|+ 마일스톤|+ Meilenstein|+ Jalon|+ Hito
新里程碑|新里程碑|新しいマイルストーン|새 마일스톤|Neuer Meilenstein|Nouveau jalon|Nuevo hito
添加故事|新增故事|ストーリーを追加|스토리 추가|Story hinzufügen|Ajouter une story|Añadir historia
编辑故事|編輯故事|ストーリーを編集|스토리 편집|Story bearbeiten|Modifier la story|Editar historia
故事标题|故事標題|ストーリーのタイトル|스토리 제목|Story-Titel|Titre de la story|Título de la historia
故事描述|故事描述|ストーリーの説明|스토리 설명|Story-Beschreibung|Description de la story|Descripción de la historia
估点|估點|見積もり|추정치|Schätzung|Estimation|Estimación
关联笔记|關聯筆記|リンク先ノート|연결된 노트|Verknüpfte Notiz|Note liée|Nota vinculada
角色|角色|ロール|역할|Rollen|Rôles|Roles
未分配角色|未指定角色|ロール未割り当て|역할 미지정|Keine Rolle zugewiesen|Rôle non attribué|Rol sin asignar
状态|狀態|ステータス|상태|Status|Statut|Estado
优先级|優先順序|優先度|우선순위|Priorität|Priorité|Prioridad
标签|標籤|タグ|태그|Tags|Étiquettes|Etiquetas
用逗号分隔|以逗號分隔|カンマ区切り|쉼표로 구분|Mit Kommas trennen|Séparer par des virgules|Separar con comas
未命名故事|未命名故事|無題のストーリー|이름 없는 스토리|Unbenannte Story|Story sans titre|Historia sin título
故事地图|故事地圖|ストーリーマップ|스토리 맵|Story Map|Story Map|Story Map
地图名称|地圖名稱|マップ名|지도 이름|Map-Name|Nom de la carte|Nombre del mapa
搜索 Story|搜尋故事|ストーリーを検索|스토리 검색|Storys suchen|Rechercher des stories|Buscar historias
搜索故事|搜尋故事|ストーリーを検索|스토리 검색|Storys suchen|Rechercher des stories|Buscar historias
按角色筛选|依角色篩選|ロールで絞り込み|역할별 필터|Nach Rolle filtern|Filtrer par rôle|Filtrar por rol
全部角色|全部角色|すべてのロール|모든 역할|Alle Rollen|Tous les rôles|Todos los roles
撤销|復原|元に戻す|실행 취소|Rückgängig|Annuler|Deshacer
重做|重做|やり直す|다시 실행|Wiederholen|Rétablir|Rehacer
导出 XMind|匯出 XMind|XMind にエクスポート|XMind 내보내기|XMind exportieren|Exporter vers XMind|Exportar a XMind
缩小|縮小|縮小|축소|Verkleinern|Réduire|Alejar
放大|放大|拡大|확대|Vergrößern|Agrandir|Acercar
详情面板|詳細資料面板|詳細パネル|상세 패널|Detailbereich|Panneau de détails|Panel de detalles
{0} 个故事 · {1} 个活动 · {2} 个角色|{0} 個故事 · {1} 個活動 · {2} 個角色|ストーリー {0} 件 · アクティビティ {1} 件 · ロール {2} 件|스토리 {0}개 · 활동 {1}개 · 역할 {2}개|{0} Storys · {1} Aktivitäten · {2} Rollen|{0} stories · {1} activités · {2} rôles|{0} historias · {1} actividades · {2} roles
立即保存或重试保存|立即儲存或重試|今すぐ保存または再試行|지금 저장 또는 재시도|Jetzt speichern oder erneut versuchen|Enregistrer ou réessayer|Guardar o reintentar
活动 Activity|活動 Activity|アクティビティ|활동|Aktivität|Activité|Actividad
双击改名|按兩下重新命名|ダブルクリックで名前を変更|더블 클릭하여 이름 변경|Doppelklick zum Umbenennen|Double-cliquer pour renommer|Doble clic para renombrar
任务 Task|任務 Task|タスク|작업|Aufgabe|Tâche|Tarea
在{0}右侧添加 Task|在 {0} 右側新增 Task|{0} の右にタスクを追加|{0} 오른쪽에 작업 추가|Aufgabe rechts von {0} hinzufügen|Ajouter une tâche après {0}|Añadir tarea a la derecha de {0}
追加 Task|追加 Task|タスクを末尾に追加|끝에 작업 추가|Aufgabe anhängen|Ajouter une tâche à la fin|Añadir tarea al final
添加或管理里程碑|新增里程碑|マイルストーンを追加|마일스톤 추가|Meilenstein hinzufügen|Ajouter un jalon|Añadir hito
添加里程碑|新增里程碑|マイルストーンを追加|마일스톤 추가|Meilenstein hinzufügen|Ajouter un jalon|Añadir hito
双击管理里程碑|按兩下管理里程碑|ダブルクリックでマイルストーンを管理|더블 클릭하여 마일스톤 관리|Doppelklick zum Verwalten der Meilensteine|Double-cliquer pour gérer les jalons|Doble clic para gestionar hitos
在{0}的{1}下添加 Story|在 {0} 的 {1} 下新增故事|{0} の {1} にストーリーを追加|{0}의 {1}에 스토리 추가|Story zu {1} in {0} hinzufügen|Ajouter une story à {1} dans {0}|Añadir historia a {1} en {0}
{0} 点|{0} 點|{0} ポイント|{0} 포인트|{0} Punkte|{0} points|{0} puntos
故事详情|故事詳細資料|ストーリーの詳細|스토리 상세|Story-Details|Détails de la story|Detalles de la historia
关闭详情|關閉詳細資料|詳細を閉じる|상세 닫기|Details schließen|Fermer les détails|Cerrar detalles
选择一张故事卡查看详情|選取故事卡以查看詳細資料|ストーリーを選択して詳細を表示|스토리를 선택하여 상세 보기|Story auswählen, um Details anzuzeigen|Sélectionnez une story pour afficher ses détails|Selecciona una historia para ver sus detalles
Story 所属角色|故事所屬角色|ストーリーのロール|스토리 역할|Rolle der Story|Rôle de la story|Rol de la historia
未分配|未指定|未割り当て|미지정|Nicht zugewiesen|Non attribué|Sin asignar
管理角色|管理角色|ロールを管理|역할 관리|Rollen verwalten|Gérer les rôles|Gestionar roles
+ 添加角色|+ 新增角色|+ ロールを追加|+ 역할 추가|+ Rolle hinzufügen|+ Ajouter un rôle|+ Añadir rol
添加、编辑或删除角色|新增、編輯或刪除角色|ロールを追加・編集・削除|역할 추가, 편집 또는 삭제|Rollen hinzufügen, bearbeiten oder löschen|Ajouter, modifier ou supprimer des rôles|Añadir, editar o eliminar roles
描述|描述|説明|설명|Beschreibung|Description|Descripción
故事/故事名称.md|故事/故事名稱.md|ストーリー/タイトル.md|스토리/스토리 제목.md|Storys/Story-Titel.md|Stories/Titre.md|Historias/Título.md
打开笔记|開啟筆記|ノートを開く|노트 열기|Notiz öffnen|Ouvrir la note|Abrir nota
创建笔记|建立筆記|ノートを作成|노트 만들기|Notiz erstellen|Créer une note|Crear nota
编辑全部|編輯全部|すべて編集|전체 편집|Alles bearbeiten|Tout modifier|Editar todo
新用户故事|新使用者故事|新しいユーザーストーリー|새 사용자 스토리|Neue User Story|Nouvelle user story|Nueva historia de usuario
在“{0}”中添加 Task|在「{0}」中新增 Task|「{0}」にタスクを追加|“{0}”에 작업 추가|Aufgabe zu „{0}“ hinzufügen|Ajouter une tâche à « {0} »|Añadir tarea a «{0}»
Task 名称|Task 名稱|タスク名|작업 이름|Aufgabenname|Nom de la tâche|Nombre de la tarea
新任务|新任務|新しいタスク|새 작업|Neue Aufgabe|Nouvelle tâche|Nueva tarea
修改 Activity|修改 Activity|アクティビティを編集|활동 편집|Aktivität bearbeiten|Modifier l’activité|Editar actividad
修改 Task|修改 Task|タスクを編集|작업 편집|Aufgabe bearbeiten|Modifier la tâche|Editar tarea
编辑|編輯|編集|편집|Bearbeiten|Modifier|Editar
打开关联笔记|開啟關聯筆記|リンク先ノートを開く|연결된 노트 열기|Verknüpfte Notiz öffnen|Ouvrir la note liée|Abrir nota vinculada
添加 Task|新增 Task|タスクを追加|작업 추가|Aufgabe hinzufügen|Ajouter une tâche|Añadir tarea
修改名称|重新命名|名前を変更|이름 변경|Umbenennen|Renommer|Renombrar
包含 {0} 个 Task，不能删除|包含 {0} 個 Task，不能刪除|タスクが {0} 件あるため削除できません|작업이 {0}개 있어 삭제할 수 없습니다|Enthält {0} Aufgaben; Löschen nicht möglich|Contient {0} tâches ; suppression impossible|Contiene {0} tareas; no se puede eliminar
删除 Activity|刪除 Activity|アクティビティを削除|활동 삭제|Aktivität löschen|Supprimer l’activité|Eliminar actividad
这个 Activity 下面还有 Task，不能删除|此 Activity 仍有 Task，不能刪除|タスクがあるアクティビティは削除できません|작업이 있는 활동은 삭제할 수 없습니다|Diese Aktivität enthält Aufgaben und kann nicht gelöscht werden|Cette activité contient des tâches et ne peut pas être supprimée|Esta actividad contiene tareas y no se puede eliminar
在右侧添加 Task|在右側新增 Task|右にタスクを追加|오른쪽에 작업 추가|Aufgabe rechts hinzufügen|Ajouter une tâche à droite|Añadir tarea a la derecha
包含 {0} 个 Story，不能删除|包含 {0} 個故事，不能刪除|ストーリーが {0} 件あるため削除できません|스토리가 {0}개 있어 삭제할 수 없습니다|Enthält {0} Storys; Löschen nicht möglich|Contient {0} stories ; suppression impossible|Contiene {0} historias; no se puede eliminar
删除 Task|刪除 Task|タスクを削除|작업 삭제|Aufgabe löschen|Supprimer la tâche|Eliminar tarea
这个 Task 下面还有 Story，不能删除|此 Task 仍有故事，不能刪除|ストーリーがあるタスクは削除できません|스토리가 있는 작업은 삭제할 수 없습니다|Diese Aufgabe enthält Storys und kann nicht gelöscht werden|Cette tâche contient des stories et ne peut pas être supprimée|Esta tarea contiene historias y no se puede eliminar
已载入 .story-map.json|已載入 .story-map.json|.story-map.json を読み込みました|.story-map.json 로드됨|.story-map.json geladen|.story-map.json chargé|.story-map.json cargado
打开故事地图|開啟故事地圖|ストーリーマップを開く|스토리 맵 열기|Story Map öffnen|Ouvrir Story Map|Abrir Story Map
重置为示例地图|重設為範例地圖|サンプルマップにリセット|예제 지도로 초기화|Auf Beispielmap zurücksetzen|Rétablir la carte d’exemple|Restablecer el mapa de ejemplo
读取失败，已停止保存以保护原文件|讀取失敗，已停止儲存以保護原始檔案|読み込み失敗。元のファイル保護のため保存を停止しました|로드 실패. 원본 파일 보호를 위해 저장이 중지되었습니다|Laden fehlgeschlagen; Speichern zum Schutz der Originaldatei pausiert|Échec du chargement ; enregistrement suspendu pour protéger le fichier original|Error al cargar; guardado suspendido para proteger el archivo original
故事地图读取失败，已停止保存。请修复 .story-map.json 后重新加载插件。|故事地圖讀取失敗，已停止儲存。請修復 .story-map.json 後重新載入外掛。|読み込みに失敗したため保存を停止しました。.story-map.json を修復してプラグインを再読み込みしてください。|로드에 실패하여 저장이 중지되었습니다. .story-map.json을 복구한 후 플러그인을 다시 로드하세요.|Story Map konnte die Datei nicht laden. Speichern pausiert. Reparieren Sie .story-map.json und laden Sie das Plugin neu.|Impossible de charger le fichier. Enregistrement suspendu. Réparez .story-map.json puis rechargez le plugin.|No se pudo cargar el archivo. Guardado suspendido. Repara .story-map.json y vuelve a cargar el complemento.
正在保存…|正在儲存…|保存中…|저장 중…|Wird gespeichert…|Enregistrement…|Guardando…
已保存到 .story-map.json|已儲存至 .story-map.json|.story-map.json に保存しました|.story-map.json에 저장됨|In .story-map.json gespeichert|Enregistré dans .story-map.json|Guardado en .story-map.json
保存失败，修改仍在内存中；请重试|儲存失敗，修改仍在記憶體中；請重試|保存失敗。変更はメモリに残っています。再試行してください|저장 실패. 변경 사항이 메모리에 남아 있습니다. 다시 시도하세요|Speichern fehlgeschlagen; Änderungen bleiben im Speicher. Erneut versuchen|Échec de l’enregistrement ; modifications en mémoire. Réessayez|Error al guardar; los cambios siguen en memoria. Reintenta
故事地图保存失败，请检查磁盘和文件权限。修改仍在内存中，请勿关闭插件。|故事地圖儲存失敗，請檢查磁碟與檔案權限。修改仍在記憶體中，請勿關閉外掛。|保存に失敗しました。ディスク容量と権限を確認してください。変更はメモリに残っています。プラグインを閉じないでください。|저장에 실패했습니다. 디스크와 파일 권한을 확인하세요. 변경 사항이 메모리에 있으니 플러그인을 닫지 마세요.|Speichern fehlgeschlagen. Prüfen Sie Speicherplatz und Dateirechte. Änderungen bleiben im Speicher; lassen Sie das Plugin geöffnet.|Échec de l’enregistrement. Vérifiez l’espace disque et les permissions. Les modifications restent en mémoire ; gardez le plugin ouvert.|Error al guardar. Comprueba el disco y los permisos. Los cambios siguen en memoria; no cierres el complemento.
里程碑：{0}|里程碑：{0}|マイルストーン：{0}|마일스톤: {0}|Meilenstein: {0}|Jalon : {0}|Hito: {0}
活动：{0}|活動：{0}|アクティビティ：{0}|활동: {0}|Aktivität: {0}|Activité : {0}|Actividad: {0}
任务：{0}|任務：{0}|タスク：{0}|작업: {0}|Aufgabe: {0}|Tâche : {0}|Tarea: {0}
状态：{0}|狀態：{0}|ステータス：{0}|상태: {0}|Status: {0}|Statut : {0}|Estado: {0}
优先级：{0}|優先順序：{0}|優先度：{0}|우선순위: {0}|Priorität: {0}|Priorité : {0}|Prioridad: {0}
估点：{0}|估點：{0}|見積もり：{0}|추정치: {0}|Schätzung: {0}|Estimation : {0}|Estimación: {0}
标签：{0}|標籤：{0}|タグ：{0}|태그: {0}|Tags: {0}|Étiquettes : {0}|Etiquetas: {0}
角色：{0}|角色：{0}|ロール：{0}|역할: {0}|Rolle: {0}|Rôle : {0}|Rol: {0}
关联笔记：{0}|關聯筆記：{0}|リンク先ノート：{0}|연결된 노트: {0}|Verknüpfte Notiz: {0}|Note liée : {0}|Nota vinculada: {0}
用户旅程|使用者旅程|ユーザージャーニー|사용자 여정|Nutzerreise|Parcours utilisateur|Recorrido del usuario
发布计划|發布計畫|リリース計画|릴리스 계획|Release-Plan|Plan de livraison|Plan de entregas
故事地图导出|故事地圖匯出|ストーリーマップ出力|스토리 맵 내보내기|Story Map Exporte|Exports Story Map|Exportaciones Story Map
用户故事地图|使用者故事地圖|ユーザーストーリーマップ|사용자 스토리 맵|User Story Map|Carte des user stories|Mapa de historias de usuario
已导出 XMind：{0}|已匯出 XMind：{0}|XMind を出力しました：{0}|XMind 내보내기 완료: {0}|XMind exportiert: {0}|XMind exporté : {0}|XMind exportado: {0}
故事/{0}.md|故事/{0}.md|ストーリー/{0}.md|스토리/{0}.md|Storys/{0}.md|Stories/{0}.md|Historias/{0}.md
语言|語言|言語|언어|Sprache|Langue|Idioma
跟随 Obsidian|跟隨 Obsidian|Obsidian に合わせる|Obsidian 설정 따르기|Obsidian folgen|Suivre Obsidian|Seguir Obsidian
语言设置保存失败|語言設定儲存失敗|言語設定を保存できませんでした|언어 설정을 저장하지 못했습니다|Spracheinstellung konnte nicht gespeichert werden|Impossible d’enregistrer la langue|No se pudo guardar el idioma
验收标准|驗收標準|受け入れ条件|인수 조건|Akzeptanzkriterien|Critères d’acceptation|Criterios de aceptación`;

export const extraLocales = ["zh-TW", "ja", "ko", "de", "fr", "es"] as const;
export type ExtraLocale = typeof extraLocales[number];
export const dictionaries: Record<ExtraLocale, Record<string, string>> = {
  "zh-TW": {}, ja: {}, ko: {}, de: {}, fr: {}, es: {},
};
for (const row of rows.split("\n")) {
  const [key, ...values] = row.split("|");
  if (!key || values.length !== extraLocales.length || values.some(value => !value)) throw new Error("Invalid translation row");
  extraLocales.forEach((language, index) => { dictionaries[language][key] = values[index]!; });
}
