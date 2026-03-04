# 10 DB Schema (AS-IS)

## 结论

- 仓库中未发现 SQLite 数据库文件、建表 SQL、迁移脚本。
- 系统实际持久化载体为 Google Spreadsheet Sheet。
- 因此本文件提供“Sheet Schema（等价 DB schema）”而非 SQL schema。

证据：
- 未发现 `.db/.sqlite` 文件（仓库文件清单）
- `Data.gs:6-12` 定义所有业务 Sheet
- `AuditTrail.gs:6-8` 定义 `Snapshots` / `Monthly_Events` 标准表头

---

## 1) 逻辑“表”清单（Sheet）

1. `Company_Profile`（`Data.gs:6`, `Data.gs:43-53`）
2. `Card_Assets`（`Data.gs:7`, `Data.gs:58-102`）
3. `Card_Catalog`（`Data.gs:8`, `Data.gs:107-159`）
4. `Reports`（`Data.gs:9`, `Reports.gs:57-78`）
5. `Snapshots`（`Data.gs:10`, `AuditTrail.gs:6`, `AuditTrail.gs:11-20`）
6. `Monthly_Events`（`Data.gs:11`, `AuditTrail.gs:8`, `AuditTrail.gs:22-42`）
7. `Monthly Health Report`（`Data.gs:12`, `Reports.gs:357-400`）

---

## 2) 字段结构（name/type/null/default/pk）

> 说明：Sheet 无强制类型、约束、PK；以下 `type/null/default/pk` 为代码语义推断。

### 2.1 `Snapshots`（标准化最明确）

来源：`AuditTrail.gs:6`, `AuditTrail.gs:239-258`

| field | inferred type | nullable | default | pk(逻辑) |
|---|---|---:|---|---|
| month | string(YYYY-MM) | 否 | 当前月 | 复合键一部分 |
| card_id | string | 否 | 无 | 复合键一部分 |
| card_name | string | 否 | 无 | 否 |
| status | string | 是 | Active | 否 |
| opened | string(YYYY-MM) | 是 | '' | 否 |
| annual_fee | number | 是 | ''/0 | 否 |
| spend_range | string | 是 | '' | 否 |
| assigned_category | string | 是 | '' | 否 |
| bonus_collected | enum('Yes','No') | 否 | No | 否 |
| est_value | number | 是 | ''/0 | 否 |
| net | number | 是 | ''/0 | 否 |
| is_bleeding | enum('TRUE','FALSE') | 否 | FALSE | 否 |
| is_watch | enum('TRUE','FALSE') | 否 | FALSE | 否 |
| is_efficient | enum('TRUE','FALSE') | 否 | FALSE | 否 |
| is_prebonus | enum('TRUE','FALSE') | 否 | FALSE | 否 |
| lifecycle_stage | string | 是 | LongTerm | 否 |
| fee_due_month | string(YYYY-MM) | 是 | '' | 否 |
| created_at | DateTime | 否 | now | 否 |

逻辑去重键：`month + card_id`（先删除当月再写入，`AuditTrail.gs:230-233`）。

### 2.2 `Monthly_Events`

来源：`AuditTrail.gs:8`, `AuditTrail.gs:279-290`

| field | inferred type | nullable | default | pk(逻辑) |
|---|---|---:|---|---|
| month | string(YYYY-MM) | 否 | 当前月 | 复合键一部分 |
| card_id | string | 否 | 无 | 否 |
| card_name | string | 是 | '' | 否 |
| event_type | enum | 否 | 无 | 否 |
| severity | enum('Low','Medium','High') | 是 | '' | 否 |
| event_key | string | 否 | 无 | 复合键一部分 |
| current_value_json | string(JSON) | 是 | '' | 否 |
| prev_value_json | string(JSON) | 是 | '' | 否 |
| message_key | string | 是 | '' | 否 |
| created_at | DateTime | 否 | now | 否 |

逻辑去重键：`month + event_key`（`AuditTrail.gs:271-278`）。

### 2.3 `Card_Assets`

来源：`Data.gs:58-102`, `Normalize.gs:99-104`, `Normalize.gs:161-163`, `main.gs:115-119`

核心被消费字段（其余按 header 动态透传）：
- `Card Name`（必需）
- `Status` / `状态`
- `Current Annual Spend (Range)` / `Spend Range` / `Annual Spend`
- `Opened (YYYY-MM)` / `Opened` / `Opened Date`
- `Bonus Collected?` / `Bonus Collected` / `Bonus collected`
- `Annual Fee`（可覆盖 catalog 年费）
- `Assigned Category`
- `assets_last_confirmed`（可由 `confirmNoChange` 自动补列）

### 2.4 `Card_Catalog`

来源：`Data.gs:116-127`, `Data.gs:146-155`

标准字段集：
- `Card Name`（键）
- `Issuer`
- `Annual Fee (USD)`
- `Base Return (Conservative)`
- `Typical Bonus Value (USD)`
- `Bonus Level`
- `Downgrade Option`
- `Notes`
- `catalog_updated_at`
- `data_confidence`
- `bonus_last_updated`
- `bonus_valid_until`
- `best_for_categories`
- `annual_fee_current`
- `product_type`

### 2.5 `Company_Profile`

来源：`Data.gs:43-53`

二列表结构：
- A列 key
- B列 value

### 2.6 `Reports` / `Monthly Health Report`

属于展示输出页，非规范化实体表。
- `Reports` 固定区域写入（`Reports.gs:5-8`, `Reports.gs:70`, `Reports.gs:424-452`）
- `Monthly Health Report` 为 8 列文本块（`Reports.gs:390-394`）

---

## 3) 索引 / 外键 / 触发器

- 物理索引：无（Sheet 不支持 SQL index）。
- 外键：无。
- 触发器（DB trigger）：无。
- GAS 菜单触发行为（非 DB trigger）：`main.gs:9-18`。
