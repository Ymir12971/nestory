# Nestory New Version — Figma Annotations 提取

> 自动提取自 Figma 页面 `Nestory-new version` (731:1269),文件 wS1hJeZhXMkUnn8YwLtFcv。
> 提取时间: 2026-07-15。共 60 个 annotation frame。


## Onboarding (O-)

### O-Launch Page-annotation  `761:1406`

- 这一页是任何时候打开 App 的启动页。

### O-Welcome-1-annotation  `761:1407`

- 这一页是用户首次打开 App 时，或者退出登录后再次打开 App 时，会出现的欢迎页的第一页。 点击 Next 跳到欢迎页的第二页。

### O-Welcome-2-annotation  `761:1408`

- 这一页是欢迎页的第二页，点击 Enter Nestory，进入到下一页 Sign in 页。

### O-Privacy claim-annotation  `791:1555`

- 这一页是登录成功后展示的隐私承诺页，向用户说明孩子数据的处理方式：严格保密加密存储、不用于 AI 训练、不出售或共享给第三方。 页面为静态展示，唯一操作是点击底部的 “I understand. Let’s start”，进入下一页 Child basic info。

### O-Child basic info-annotation  `761:1450`

- 在这一页点击 Tap to Add Photo，则会直接进入到用户的相册，仅能选择其中某一张照片，选择好之后就显示在这里。 然后 Birthday 这里的缺省文案显示的是当天日期(跟随系统当前日期)，点击 Select 之后，会调用系统自带的 Date Picker 来选择一个时间。 这一页的头像、姓名和 birthday 都是必填项。如果这三个有一个没有填完的话，Continue 按钮就会一直处于禁用态，直到三个信息全部填完。

### O-Birthday Confirm popup-annotation  `761:1451`

- 在上一页用户填完信息之后，点击 Continue 则先蹦出这个弹窗来确认用户是否输入了正确的生日。 点击 Back to Edit 则弹窗消失，点击 Confirm 则进入到下一页。

### O-Child more Details-annotation  `761:1452`

- 这一页的选项全部是选填的。用户如果什么都不填，直接点击 Continue 或 Skip 都可以进入下一页。 具体逻辑如下： 1. 按钮操作： • 点击 Continue：把当前页面已填的内容记录下来，并进入下一页。 • 点击 Skip：不管这一页填没填，全部当空内容来处理，并进入下一页。 2. 单位切换： • 身高：默认显示厘米（cm），点击后可以切换成英尺+英寸（feet + inch）的方式显示。 • 体重：默认显示千克（kg），点击后可以切换成磅（lbs）显示。

### O-Relationship-annotation  `761:1455`

- 这个页面让用户选择孩子该如何称呼当前用户，这个页面也是必填项。 用户如果选择了不是 Other 的话，才可以激活 Continue 按钮进入到下一页。

### O-Relationship(custom)-annotation  `761:1456`

- 如果用户选择的是 Other 的话，那么可以在激活的输入框里输入名称。然后输入的字符只要不是空字符，Continue 按钮就可以激活。 如果输入之后又点击了其他的 tag（比如说 dad 或者 uncle 的话），那么 other 这里的输入框又会变成禁用，但是数据会保留。

### O-Children list(one child)-annotation  `761:1453`

- 当第一个孩子添加完之后，进入到这一页，标题会带入孩子的名称显示“Oset”，然后会把第一个孩子的头像、名称、年龄和性别带过来，表示这个孩子已经添加完成。 接着，系统会引导用户添加第二个孩子。 也可以跳过。 如果点击 Add Another Child 之后，则会重新再进行一遍：从开始选择照片、输入名字等，把之前的两个页面再过一遍。 年龄显示规则（全产品通用）：采用缩写格式——不满 1 个月显示 “Xd old”（如 12d old）；满 1 个月至不满 2 岁显示 “Xmo old”（如 12mo old）；满 2 岁显示 “Xy Ymo old”（如 2y 4mo old；Y 为 0 时省略，只显示 “Xy old”）。按孩子生日与当前日期的日历差计算。产品中所有显示孩子年龄的位置（Onboarding、Settings、Profile 切换弹窗等）均遵循此规则。

### O-Children list(more than one child)-annotation  `761:1454`

- 这个页面是假设用户已经添加了第二个孩子，他的档案也会出现在这里，标题会变成“Two babies are all set”；如果是三个，则是“Three babies”。 第二个孩子这里假设叫 John，假设他的性别那一栏选择的是“Prefer not to say”，所以这里就不显示。 目前系统不限制可以添加多少个孩子，可以一直添加。

### O-Notification access-annotation  `761:1457`

- 在这里点击“Enable Notifications”之后，都会进入到系统通知的设置页面。 如果用户确实打开且返回，则直接进入到下一页；如果用户没有打开通知，回来之后依然保留在这一页。

### O-Welcome to premium-annotation  `761:2534`

- 如果用户付费成功，则返回显示“Welcome to Premium”这一页。 对应的，如果用户是月付的话，则把 Plan 里边的 Yearly 改成 Monthly，对应的价格以及 Next Billing 等等这些都要做对应的调整。

### O-Launch Page(transition to Home)-annotation  `761:2535`

- 这个页面虽然叫 Launch Page，但是出现在这里是表示 Onboarding 流程走完之后、正式进入到 Home Page 时的第一个过渡。

### O-Terms of Service-annotation  `761:2536`

- 当用户在任何地方点击了 Terms of Service 或者是 Privacy Policy 之后，则会进入到对应的页面。 这两个页面都是 H5 页面，里面的内容会由 Termly 网站来提供。到时候 Termly 会提供一个嵌入式的代码，这样的话 Termly 那边有更新之后，这边也会实时更新。

### O-Choose plan(yearly)-annotation  `761:1458`

- 这一页默认选中年付的 100 刀这个选项。 用户操作逻辑如下： 1. 如果点击 Start with free，则直接跳过 2. 如果点击 Start with premium，则进入支付流程 关于支付流程： 支付流程应该是由谷歌或者是苹果来直接承载的，这里不做设计。 如果支付成功，则进入到下一页；如果支付失败，则在页面中间出现一个 toast 的提示，如下所示：
- [embedded: Toast]

### O-Sign In-annotation  `761:1409`

- 目前仅能通过关联 Apple 账号或者是 Google 账号来登录。 点击其中一个会跳转到对应的 Apple 和 Google 自带登录界面。跳转回来之后： - 如果登录成功，则进入到下一页 Privacy Claim 这一页 - 如果登录失败，则会在当前页面中间出现一个 toast告知失败,toast如下方所示，2秒后消失：
- [embedded: Toast]

## Home (H-)

### H-Launch Page-annotation  `819:3396`

- 每次打开 App，如果用户已经完成了 onboarding 并且有了账户，那么每次打开都会先启动这个 launch page，然后再进入 home 页面

### H-Sign In-annotation  `819:3398`

- 如果用户退出了登录，就会回到登录页。 如果用户退出了登录，然后退出 App，再次打开 App 之后，启动页结束会先显示登录页，登录之后再到 Home 页

### H-Home Empty-annotation  `761:1392`

- 这一页是用户首次进入首页时看到的界面，每个用户都是一样的。 除非用户在 onboarding 阶段就已经创建了超过一个孩子的 profile。如果是那样的话，在头像和名字的旁边会显示一个切换按钮。这一部分我做成 multiple children 的一个 frame，放在下面了。 用户点击 Add Memory，则可以进入添加 Memory 的页面。添加 Memory 的页面内容流程都不变。

### H-Home Empty-Multiple Children-annotation  `761:1393`

- 如果用户在 onboarding 阶段就已经创建了超过一个孩子的 profile，在头像和名字的旁边会显示一个切换按钮。 如果是 Free Plan 的用户，会出现下方第一个弹窗。用户不能点击切换孩子的 Profile，只能点击 Upgrade to Premium 或者退出弹窗。 如果已经是 Premium 用户了，则显示下方第二个弹窗。用户点击后可以切换孩子的 Profile，切换之后，整个 App 里从 Stories 也会跟着切换成对应孩子的stories（一个profile一个story档案）. Settings里没有变化（多个profile通用）。 说明中内嵌的弹窗/浮层为实际 UI：出现时浮于当前页面之上，页面带黑色半透明遮罩。
- [embedded: H-Sheet · Profile Switcher · Free]
- [embedded: bsHandle]
- [embedded: title]
- [embedded: titleBlock]
- Switch Profile
- Free plan supports one active profile. Upgrade to switch between them.
- [embedded: body]
- [embedded: profileList]
- [embedded: profileRow]
- [embedded: col]
- Emma
- 2y 4mo old, Girl
- [embedded: StatusBadge]
- [embedded: divider]
- [embedded: profileRow]
- [embedded: col]
- Oliver
- 14mo old, Boy
- [embedded: divider]
- [embedded: profileRow]
- [embedded: col]
- Lily
- 1mo old
- [embedded: cta]
- [embedded: H-Sheet · Profile Switcher · Premium]
- [embedded: bsHandle]
- [embedded: bsContent]
- [embedded: titleBlock]
- Switch Profile
- [embedded: bsContent]
- [embedded: profileList]
- [embedded: profileRow]
- [embedded: col]
- Emma
- 2y 4mo old, Girl
- [embedded: StatusBadge]
- [embedded: divider]
- [embedded: profileRow]
- [embedded: col]
- Oliver
- 14mo old, Boy
- [embedded: divider]
- [embedded: profileRow]
- [embedded: col]
- Lily
- 1mo old

### H-First Memory-annotation  `761:1394`

- 用户添加完第一个 memory 返回之后，会显示如图信息，并显示当前的年份和月份。 由于这是第一条 memory，年份点击后的切换选项仅有当前年份（切换弹窗不变），月份也只显示当前月份。 只有当用户第一次添加 memory 后，系统才会显示该 memory 所属的年份和月份，并从此时开始第一次记录。 举个例子： 用户是在 3 月份下载并打开 App，但是并没有上传 Memory，直到 7 月份才开始了第一次记录。那么他第一次记录的时间就从 7 月开始计算，显示的第一个月份也是 2026 年的 7 月份

### H-Normal Memory list-annotation  `761:1395`

- 随着用户添加的 memory 数量变多，则依次向下显示。如果超过了当前月份，则顶部的月份筛选处也会出现新的月份。当前月永远显示在最左侧。也就是说，如果用户假设是从7月开始记录的，那么到了9月份，9月份就会显示在最左边。

### H-Current month empty-annotation  `761:1396`

- 因为最左侧且被选中的月份表示当前月。在当前月结束之前，如果一直没有上传，则如图所示显示. 比如，当前月份到了 10 月份，但是用户并没有任何记录。那么在切换到（或者说在显示）下一个月份 11 月份之前，10 月份的记录应该一直如图所示. 正因为是这样，所以当用户开始第一份记录之后，后面的月份不管有没有记录，都会显示出对应的筛选项。 但如果某一个过往月份没有任何 memory 的话，那这个月份的 filter 就不会显示出来，除非后续用户补了 memory 才会有。比如上图这里，8 月份没有任何的 memory，那么就不会显示 8 月份的 filter

### H-Add Memory Popup-annotation  `762:2731`

- 点击 Add Memory 之后，会出现如图这样的弹窗，用户可以： 1. 点击 Just a Note 2. 选择 Choose from Album：获取相册权限，然后从相册里选择照片

### H-Add Memory page Empty-annotation  `762:2744`

- 这一页表示的是在 Add Memory 的页面里，用户没有任何输入，也没有选择任何照片的样子。此时右上角的 Save 是禁用态。 在这里，text区域有内容是激活 Save 按钮的唯一条件。也就说，不可以用光有照片没有文字，但可以仅有文字。

### H-Add from "Just a note"-annotation  `762:2746`

- 在 Add Memory 的时候，用户如果选择的是 Just a Note 进入的话，那么在进入此页面时，直接从底部滑动显示出系统自带的键盘，方便用户直接输入文本。 文本字符限制为500个单词，超出后，显示如下的toast，2秒后消失：
- [embedded: Toast]

### H-Add from "Take a photo"/"Choose from album"-annotation  `762:2748`

- 用户添加的照片最多数量为 9 个，如果加满 9 个的话，那么带有加号的占位提示符就会消失。 这里的文本输入框高度是固定的。如果输入内容超出，则会自动向上滚动，需要滑动去查看。 1. Text 的显示规则： 如果用户在 Text 的弹窗里选择了一个，则在这里显示出来。 2. Tags 的显示规则： 如果用户在 Tags 的弹窗里选择了一个，则在这里显示出来用户所选择的 Tag 名称；如果是多个，则显示第一个，后面显示“+X”。 3. Memory Data： 用户如果点击了 Memory Data 之后，则会显示系统自带的 Date Picker。

### H-New Memory Added-annotation  `762:3430`

- 当用户点击了 Save 之后，则会返回到 Home 页面，同时显示出来用户所添加的 Memory，并在页面中间出现一个成功的 Toast，表示新的 Memory 已经添加。Toast 显示 2 秒后自动消失。

### H-View Memory-annotation  `762:3339`

- 当用户点击了一个已经存在的 memory 之后，则会进入到它的查看页面。 在查看页面，会显示： • 当时用户输入的文本(不显示滚动条，全文显示) • 上传的照片 • 选择的 tag • 记录的时间 点击右上角的 edit 之后，即可进入到编辑页面。

### H-NoPremium request to edit Popup-annotation  `762:3451`

- 如果是当前月份的 memory 还没有生成 stories 的话，那么这个 memory 是任何用户都可以直接去更改的。 但如果它是过往月份的 memory，则仅允许付费用户直接去更改；如果是非付费用户的话，会先弹出提示用户升级的弹窗。

### H-Memory Edit Alert-annotation  `762:3453`

- 如果是过往月份的 memory，付费用户如果要点击 edit 去编辑的话，会弹出上图的弹窗，让用户首先要知道这个 memory 已经被用来生成 story 了。如果更改的话，对应的 story 也可以重新生成。

### H-Edit Memory Page-annotation  `762:3455`

- 在进入 Memory 的编辑页后，最底部有一个 Delete Memory。用户点击之后可以删除，但是点击之后会先蹦出一个二次确认弹窗，如下方所示： 如果用户编辑或删除完成之后，都会返回到 Home 页面的 Memory 列表，同时会在页面中间出现 Toast 告知用户“已成功编辑”或“已成功删除”。 说明中内嵌的弹窗/浮层为实际 UI：出现时浮于当前页面之上，页面带黑色半透明遮罩。
- [embedded: H-04 / Sheet · Delete Memory Confirm]
- [embedded: bsHandle]
- [embedded: title]
- Delete this memory?
- This can't be undone. All photos and notes in this memory will be permanently removed.
- [embedded: cta]
- [embedded: Toast]
- [embedded: Toast]

### H-full picture-annotation  `775:1724`

- 这张图里的 body 区域表示的是用户点击查看的大图。 如果用户在 memory 里点击查看，且 memory 里面有多张大图的话，底下就会出现指示条，可以左右滑动去依次查看。 查看大图仅适用于在查看 memory 的时候。如果是添加或是 edit 的时候，点击照片是不会显示大图的。

### H-Memories couldn't load-annotation  `775:1718`

- 如果用户的 memory load 不出来的话，则显示此页面。用户把页面向下滑动，也可以刷新。

## Stories (S-)

### S-Story Empty-annotation  `761:1397`

- 这一页是用户首次进入 Stories 的界面。 由于是当前月份，Stories 还没有生成，所以在顶部会显示孩子的当前月份 Stories 还有多少天生成。同时这里也标记了有多少个 Memory：如果是 0 就显示 0 个；如果多于 0 个，就显示对应的数字。 文案中的孩子名与月份均为动态字段。

### S-First Story Generating-annotation  `761:1398`

- 到了月底最后一天的晚上，开始要生成 stories 的时候，就会如图显示表示 generating。 同时，顶部会出现年份的筛选器。这个年份是当前年，或者说是当前月份所属的年份。

### S-No Memory to generate-annotation  `761:1399`

- 最后生成之后有两种结果： 1. 因为 memory 数量不够而无法生成 2. 正常生成 上图显示的是 memory 数量不够无法生成的情况

### S-Normal Generation-annotation  `761:1400`

- 如果用户当月的 memory 正常显示了，则如此图显示

### S-Normal Generation 2-annotation  `761:1401`

- 到了下一个月份，当前月份就会更新。 一进入新月份，顶部就会显示“Your July Stories in x days”，这个天数会一直变化。而上个月的 stories 则会转为一个历史 story。

### S-Premium recovered-annotation  `761:1403`

- 如果用户在后来的某一个月份 upgrade 了，那么最顶部依然显示当前月份的等待生成状态。而之前因为订阅停止而错过、没有生成的月份，则会显示如第二张图所示的状态。 比如说在 2026 年的 8 月份，就会显示 story paused.  这种情况下，即使用户 upgrade 了，那么在用户 premium 停止或暂停的期间，stories 也不会再允许重新生成了。

### S-Premium recovered-Past months folded-annotation  `761:1404`

- 如果用户有多个月份，超过一个月份都还没有续费的话，那么这些月份会合成一张卡片，显示的是 Story Paused 那举个例子，比如说用户在 2026 年的 6 月份和 7 月份用完了两次 Story，那么从 2026 年 8 月开始则全部停止。 如果用户到了 2026 年 11 月份重新 upgrade 之后，那么从 2026 年 8 月到 2026 年 10 月之间的卡片都会显示出来，但全部显示的是 stories paused. 再举个例子，比如说用户 2026 年 8 月停止了 Premium，直到 2027 年 3 月才重新开始： 1. 2026 年： 7 月往后只会显示一张卡片，显示 August 到 December 都是 Stories Paused 2. 2027 年： 会将 1 月和 2 月合成一张卡片，显示 January to February 是 Paused 如果 2027 年一整年都没有续费，直到 2028 年才续费的话，那么 2027 年这一整年也会合成一个卡片

### S-Over one year-annotation  `761:1405`

- 在 stories 这里是按年份去分类的。也就是说，如果 stories 的显示跨年，则会在顶部的时间选择器里出现新的年份。 关于年份的逻辑如下： 1. 当前年份在最左边，且默认选中。 2. 对应年份只展示对应年份下的 stories。

### S-Regeneration allowed-annotation  `761:2715`

- 对于过往月份，如果因为 memory 发生了变化（例如被用户重新编辑、删除或增加了内容），stories 允许用户重新生成，但这仅限于付费用户。 具体逻辑如下： 1. 免费用户：不出现任何提示。 2. 付费用户：会在卡片中间提示memory 已经发生了变化，用户点击即可重新生成(重新生成后，提示条消失，直到memory再次变化)。这种情况包含两种： 1. 之前的 memory 成功，且之前的 story 也成功生成了。 2. 之前的 story 因为缺少 memory 而没有生成。 这两种情况都可以重新生成。没有 memory 的情的卡片放在下边了。 注意：重新生成会覆盖之前的 stories。因此，点击后会显示一个弹窗让用户进行二次确认。具体效果可以参考右侧的页面。 说明中内嵌的弹窗/浮层为实际 UI：出现时浮于当前页面之上，页面带黑色半透明遮罩。
- [embedded: StoryCard]

### S-Regeneration confirm popup-annotation  `791:1563`

- 付费用户在 Stories 页点击重新生成后，弹出此二次确认弹窗：浮于当前页面之上，页面带黑色半透明遮罩。文案提示新的 Story 会覆盖旧的。 点击 Confirm 开始重新生成并关闭弹窗；点击 Cancel 仅关闭弹窗，不做任何操作。

### S-Stories couldn’t load-annotation  `775:1720`

- 如果用户的 story load 不出来的话，则显示此页面。用户把页面向下滑动，也可以刷新。

### S-Free quota used/Premium Ended-annotation  `761:1402`

- 而当免费用户的2次Story机会使用完了之后，则会在顶部显示一个提示。 这个提示会一直显示在这里。如果用户没有 upgrade，此后这个页面就会一直保持这个样子，不再产生新的内容。 那如果是 Premium 到期未续费的话，则把对应的卡片更换成下方这个卡片（Frame: StoryCard-Premium ended）。
- [embedded: StoryCard-Premium ended]
- [embedded: lock-line]
- Your Premium has ended. Renew to keep Emma's Stories going.

## Settings (ST-)

### ST-feedback-annotation  `775:1579`

- 在活动详情页，有一个“How does the 10% off work?”。点开之后，会出现下方的第一个弹窗，里面显示这 10% off 是如何 work 的。 然后，用户可以在这个页面的文本框内输入文本： 1. 文本框的高度是固定的，超出高度后需要滑动显示 2. 限制字符是 500 个字符 关于添加照片： 这里的逻辑跟在 Memory 里面添加照片的逻辑完全一样，包括添加的数量，最多也是 9 张。 当用户输入文字或者添加图片之后，就会激活底部的“Send Feedback”按钮。 用户点击了 Send Feedback 之后，会出现下方第二个弹窗，表示“Thanks for your feedback”。 然后在那里会显示用户的邮箱，这个邮箱是通过用户的谷歌或苹果账号直接拉取过来的，用户也可以点击去调整和修改。 点击 All Done 之后，就返回到 Settings 的主页。 注意:这里的按钮激活逻辑与 Add Memory 不同——在 Feedback 页,输入文字或添加图片,满足任一条件即可激活 Send Feedback 按钮;而 Add Memory 页必须有文字才能激活 Save(仅有图片不行)。 说明中内嵌的弹窗/浮层为实际 UI：出现时浮于当前页面之上，页面带黑色半透明遮罩。
- [embedded: Bottom Sheet]
- [embedded: bsHandle]
- [embedded: title]
- How the 10% off works
- [embedded: body]
- [embedded: benefit]
- [embedded: vip-crown-2-line]
- If we ship your idea in the app, you'll get an email the day it goes live.
- [embedded: benefit]
- [embedded: vip-crown-2-line]
- Your very next Premium bill is automatically discounted 10% pre-tax. No code needed.
- [embedded: benefit]
- [embedded: vip-crown-2-line]
- Limited to one discount per idea shipped. Discounts stack before they take effect.
- [embedded: benefit]
- [embedded: vip-crown-2-line]
- If your discounts add up to more than 100%, the extra rolls onto the bill after that, and so on.
- [embedded: benefit]
- [embedded: vip-crown-2-line]
- Free-tier members get the discount applied the month they upgrade.
- [embedded: benefit]
- [embedded: vip-crown-2-line]
- Discounts expire in one year since you receive our notification.
- [embedded: cta]
- [embedded: Bottom Sheet]
- [embedded: bsHandle]
- [embedded: title]
- Thanks for your feedback!
- [embedded: body]
- [embedded: benefit]
- We’ll get back to you soon and let you know if your earn 10% off Premium bill.
- [embedded: benefit]
- This is the email we’ll connect you with. Please change if it’s not correct.
- [embedded: Input]
- [embedded: cta]

### ST-Child Profile Edit(premium)-annotation  `775:1580`

- 如果是 Premium 用户，点击某个孩子的 profile 进入之后，就可以更改照片、姓名、性别、身高和体重。

### ST-Child Profile Edit(free)-annotation  `775:1632`

- 如果是 Free 用户想要更改某一个孩子的 Profile 的话，进入之后会在顶部常驻显示提示，告诉用户 Free Plan 只支持一个 Active Profile。

### ST-Current plan(Free)-annotation  `775:1637`

- 如果在 Settings 页面，用户是 Free Plan，点击了 Upgrade 之后，则进入该页面。 这个页面显示用户的 Current Plan 是 Free Plan，然后默认选中年付 100 刀的区域。点击 Start with Premium，则进入到支付界面。

### ST-Current plan(Premium)-annotation  `775:1642`

- 如果用户的 Current Plan 是 Premium 的话，则进入到该页面，并显示用户 Plan 的详细信息，比如是 Yearly 还是 Monthly，然后 Price 是每年 100 还是每个月 10 块，以及 Next Billing 的时间。 具体交互流程如下： 1. 如果点击底部的 Cancel Subscription，则会显示下方第一个弹窗： (a) 点击 Keep my plan：返回到 Current Plan 页面。 (b) 点击 Continue to cancel：再次蹦出第二个弹窗，让用户选择想要离开的原因。 2. 在第二个弹窗中，点击 Confirm to Cancel 后进入到下一个页面，显示 Premium has been cancelled。 说明中内嵌的弹窗/浮层为实际 UI：出现时浮于当前页面之上，页面带黑色半透明遮罩。
- [embedded: ST-02 / Sheet · Cancel Step 1]
- [embedded: bsHandle]
- [embedded: title]
- Your little one’s story isn’t finished yet
- Cancel now and you’ll lose:
- [embedded: body]
- [embedded: lossList]
- [embedded: lossRow]
- [embedded: Frame]
- ✕
- Unlimited child profiles
- [embedded: lossRow]
- [embedded: Frame]
- ✕
- Unlimited monthly Stories
- [embedded: lossRow]
- [embedded: Frame]
- ✕
- Watermark-Free Sharing
- [embedded: lossRow]
- [embedded: Frame]
- ✕
- Access to regenerate past Stories
- [embedded: lossRow]
- [embedded: Frame]
- ✕
- Annual Recap and more features
- [embedded: cta]
- [embedded: ST-02 / Sheet · Cancel Step 2]
- [embedded: bsHandle]
- [embedded: title]
- We’d love to know why you’re leaving
- Optional - your feedback helps us improve.
- [embedded: body]
- [embedded: reasonRow]
- [embedded: Frame]
- Too expensive
- [embedded: reasonRow]
- [embedded: Frame]
- Not using it enough
- [embedded: reasonRow]
- [embedded: Frame]
- Missing a feature I need
- [embedded: reasonRow]
- [embedded: Frame]
- Switching to another app
- [embedded: reasonRow · selected]
- [embedded: radio]
- Other
- [embedded: otherTextarea]
- Tell us more (optional)
- 0 / 200
- [embedded: cta]
- [embedded: Confirm Cancel]

### ST-Plan cancelled-annotation  `775:1643`

- 如果用户成功 Cancel Premium，则显示此页面；点击 Back to Settings，则返回到 Settings 主页面。

### ST-Account-annotation  `775:1717`

- 在 Account 页面里，会显示用户目前 Connect 的是 Apple 账户还是 Google 账户。 相关的交互逻辑如下： 1. 点击 Logout： 会出现下方第一个弹窗。如果用户确认 Logout，则会一直退回到 Sign In 页面；用户再次 Sign In 之后，会回到主页。 2. 点击 Delete Account： 会出现下方第二个弹窗，询问用户是否确定要 Delete Account。用户必须完整输入大写的“DELETE”单词，Delete Account 的按钮才会激活，否则该按钮会一直是置灰的。 3. 如果用户是 Premium 用户： 则会显示下方第四个弹窗（新版，开发以此为准；其上方第三个弹窗为旧版，已作废）。新版明确告知：删除账号不会自动取消平台订阅，需引导用户前往 App Store / Google Play 的订阅设置中自行取消，避免继续扣费。 说明中内嵌的弹窗/浮层为实际 UI：出现时浮于当前页面之上，页面带黑色半透明遮罩。
- [embedded: ST-07 / Sheet · Logout Confirm]
- [embedded: bsHandle]
- [embedded: title]
- Log out of Nestory?
- You can always sign back in with the same account.
- [embedded: cta]
- [embedded: ST-07 / Sheet · Delete Account Confirm · Free]
- [embedded: bsHandle]
- [embedded: title]
- Delete your account?
- All your data — Stories, Memories, Profiles — will be permanently removed. This can’t be undone.
- [embedded: body]
- Type “DELETE” to confirm
- [embedded: Input]
- [embedded: cta]
- [embedded: ST-07 / Sheet · Delete Account Confirm · Premium · v2]
- [embedded: bsHandle]
- [embedded: title]
- Delete your account?
- All your data — Stories, Memories, Profiles — will be permanently removed. This can’t be undone.
- [embedded: body]
- [embedded: subscriptionNotice]
- [embedded: error-warning-line]
- [embedded: noticeText]
- Your subscription won’t cancel automatically
- Deleting your account doesn’t cancel your Premium subscription. Please cancel it in your App Store or Google Play settings to avoid future charges.
- [embedded: confirmBlock]
- Type “DELETE” to confirm
- [embedded: Input]
- [embedded: cta]

### ST-Data & Privacy-annotation  `791:1559`

- 在 Settings 主页点击 Data & Privacy 进入。纯静态说明页，解释数据的使用方式（AI 生成 Story、不出售数据、传输与存储均加密）。无其他交互，点击左上角返回箭头回到 Settings 主页。

### ST-About-annotation  `791:1561`

- 在 Settings 主页点击 About Nestory 进入。显示 slogan、版本号、Terms of Service 与 Privacy Policy 入口（点击进入对应 H5 页面，与 Onboarding 的 O-Terms of Service / O-Privacy Policy 相同）、图标版权说明和联系邮箱 support@nestory.love（点击调起系统邮件）。 点击左上角返回箭头回到 Settings 主页。

### ST-Settings(free plan)-annotation  `775:1562`

- 在设置页面的主界面，各模块的具体逻辑如下： 1. 顶部优惠活动： 顶部是一个优惠活动（后续可能会调整），点击后可进入详情页。 2. Child Profile： 提供一个入口，点击可以添加更多的 Profile。目前暂时不支持删除 Profile。 3. Story Notification： 根据用户在 Onboarding 阶段是否开通了 Notification，来判定此处的开关默认是开还是关。 4. Upload Reminders： (a) 开关默认是打开的。 (b) 触发条件：如果用户连续三天没有上传任何 Memory，且同时在这三天内没有生成 Story，系统就会发出通知。 (c) 通知文案："Turn every moment into a memory. A photo or a quick note :)" 5. Story Location： 默认是关闭的。如果用户在手机系统设置中打开了定位权限，这里也会跟随打开。 6. Current Plan： (a) 根据用户是 Free 用户还是 Premium 用户来展示不同的样式。 (b) Free Plan 页面会记录一个 Story Remaining 的数字。如果额度用完，则显示 "0 Stories remaining"。

### ST-Settings(premium plan)-annotation  `791:1557`

- 这一页是 Premium 用户的 Settings 主页，结构与 Free Plan 版一致，差异点如下： 1. Current Plan 卡片显示 Premium Plan 及付费周期和续费时间（如 Yearly, Renews Jul 7, 2027），点击进入 ST-Current plan(Premium) 页。 2. Child Profile 列表里所有孩子均为可用状态，点击任意一个可直接编辑（对应 ST-Child Profile Edit(premium)）。 其余模块逻辑与 Free 版说明一致。

## Global

### global-Paywall-annotation  `775:2704`

- 在任何地方点击了 View Premium Benefits 的时候，就会出现这个弹窗。点击 Upgrade to Premium 就会进入到付款页面。

### global-Welcome to premium-annotation  `775:1722`

- 在任何时候，不管用户是第一次订阅，还是又 renew 了 Premium，成功返回之后都会跳转到这个 Welcome to Premium 页面。点击 "I'm all set" 即可返回到用户最开始点击付费和 Premium 的原位置。

---

## 决策记录(Justin,2026-07-15)

针对 annotation 通读发现的三个存疑点:

1. **Memory 文本上限 = 500 字符**(Handoff 与 annotation "500 单词" 不一致 → 按字符)。已落地到 `packages/types/src/productConfig.ts` 的 `MEMORY_CONSTRAINTS.maxTextChars`,前后端共用,以后改一处即可。
2. **Add Memory 弹窗 = 3 项**(Just a Note / Take a photo / Choose from Album)。已配置化:`ADD_MEMORY_ENTRY_OPTIONS`。
3. **Regenerate 判定 = "有 Story 占位卡即可生成"**:Stories 时间轴起点(第一份 Story 月份)之后的月份都有占位卡,memory 变化后 Premium 可生成/重新生成——包括当初因素材不足未生成的月份;时间轴起点之前的补录月份、断订 Paused 月份没有可生成占位,永不生成。

4. **升级入口 = 双 CTA 模式**(截图核实):升级弹窗主按钮 "Upgrade to Premium" → 支付;次级链 "View Premium benefits" → global-Paywall。遗留:主按钮进支付前在哪选月付/年付——建议 MVP 统一弹 global-Paywall(自带套餐选择),待定。
5. **StoryCard 变体映射**(截图核实):Locked=顶部琥珀配额尽横幅;NoPremium=灰色 Story paused 折叠卡;NoMemories=当月无素材卡;AllowRegenerate(-2)=对应卡 + 蓝色 regenerate 条。
6. **"Story paused (Trial ended)" 文案是故意的**(Justin 2026-07-15):Free 2 份配额语义上即"试用体验",注册后前两个月各生成一次,用尽后空窗折叠卡显示此文案;Handoff 的"无 Trial"仅指平台订阅无免费试用期。Premium 断订则显示 "Your Premium has ended. Renew..." 卡,两者文案不同。
7. **Profile Switcher 徽标 Free="Active" / Premium="Current"**:照设计稿,不统一(Justin 确认)。
