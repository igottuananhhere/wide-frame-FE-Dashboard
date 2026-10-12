# Wireframe hoàn thiện UX/UI dashboard (US06)

Tài liệu này chốt wireframe và thứ tự ưu tiên cho dashboard desktop/mobile của US06. Giao diện hiện dùng dữ liệu mock/mô phỏng, không phải dữ liệu vận hành thực; Floor 2 được giữ làm mẫu tĩnh để tổng quan tòa nhà vẫn có phạm vi hai tầng.

## Mục tiêu

- Làm rõ phạm vi và độ mới của số liệu: Floor 1 có telemetry mô phỏng; Floor 2 có dữ liệu mẫu tĩnh; Floor 3–5 chưa có dữ liệu.
- Không để sự cố đã tiếp nhận biến mất khỏi danh sách công việc khi chưa được giải quyết.
- Đưa hành động quan trọng tới đúng đối tượng, dễ thao tác trên mobile và bằng bàn phím.
- Ghi rõ đơn vị, mốc thời gian và tính chất lũy kế của biểu đồ năng lượng.
- KPI điện lãng phí chỉ áp dụng cho Floor 1 khi có baseline tương ứng; không gộp dữ liệu mẫu Floor 2 vào phép tính này.

## Ưu tiên cải thiện

1. **Sự cố:** tách "Chưa tiếp nhận", "Đang xử lý" và "Đã giải quyết". Mặc định hiện tất cả sự cố chưa giải quyết; Acknowledge không được làm sự cố biến mất khỏi hàng đợi. Cần xác định điều kiện và quyền hạn trước khi thêm thao tác Giải quyết.
2. **Trạng thái dữ liệu:** không dùng chung nhãn LIVE và thời điểm cập nhật cho mọi tầng nếu Floor 2 không được telemetry tự động cập nhật. Hiện trạng thái và thời điểm theo từng tầng hoặc nhóm chỉ số.
3. **Đường dẫn thao tác:** "Xem thiết bị" phải dẫn tới đúng thiết bị; "Xem trên 3D" không nên hứa hẹn chi tiết phòng khi trang đích vẫn là trang dự kiến.
4. **Biểu đồ năng lượng:** ghi ngày tham chiếu, đơn vị kWh, nhãn "điện năng lũy kế" và không trình bày điểm giờ tương lai như số đo đã ghi nhận.
5. **Mobile và bàn phím:** đưa hành động sự cố ra vùng dễ thấy thay vì cột cuối của bảng cuộn ngang; không cho Tab vào menu đang đóng; chuyển và khôi phục focus khi mở/đóng chi tiết phòng.
6. **Phạm vi trong URL:** giữ tầng đang chọn khi tải lại hoặc chia sẻ đường dẫn, tránh tự động chuyển về toàn tòa nhà mà người xem không nhận ra.
7. **Ngôn ngữ hỗ trợ:** khai báo ngôn ngữ trang phù hợp với nội dung tiếng Việt, đánh dấu riêng các cụm tiếng Anh cần giữ.

## Wireframe 1: Tổng quan desktop

Bố cục ưu tiên thông tin cần xử lý và phạm vi dữ liệu trước sơ đồ minh họa. Các số liệu cần có nhãn mô phỏng và phạm vi tương ứng.

```text
+--------------------------------------------------------------------------+
| ICS DIGITAL TWIN     [Toan toa nha v]    MO PHONG    Canh bao    Tai khoan |
+---------------+----------------------------------------------------------+
| Tong quan     | TONG QUAN VAN HANH                                        |
| Nang luong    | ICS Headquarters                  [2/5 tang co du lieu]    |
| Moi truong    | Floor 1: mo phong cap nhat | Floor 2: du lieu mau tinh    |
| Thiet bi      | Floor 3-5: chua cau hinh giam sat                         |
| Su co         |----------------------------------------------------------|
| Tai san       | [Su co chua giai quyet] [Dien nang hom nay] [Thiet bi loi] |
| Mo hinh 3D    |     Xem su co           Xem nang luong     Xem thiet bi   |
|               |----------------------------------------------------------|
|               | SU CO CAN XU LY          | SO DO CAC TANG                 |
|               | [Chua tiep nhan] [Dang xu ly] | 5  Chua co du lieu       |
|               | Muc do  Ten su co  Tang  | 4  Chua co du lieu             |
|               | Canh bao ...      Floor 1 | 3  Chua co du lieu            |
|               | Canh bao ...      Floor 2 | 2  Du lieu mau tinh  [>]      |
|               | [Xem tat ca su co]       | 1  Dang mo phong    [>]       |
|               |----------------------------------------------------------|
|               | DIEN NANG LUY KE (kWh)                                    |
|               | [Bieu do, truc X: gio; truc Y: kWh]                       |
|               | Du lieu mo phong ngay ... | Floor 1 cap nhat luc ...     |
+---------------+----------------------------------------------------------+
```

## Wireframe 2: Trang sự cố desktop

"Tiếp nhận" là bắt đầu xử lý, không phải "Đã giải quyết". Sự cố đã tiếp nhận vẫn thuộc nhóm "Chưa giải quyết".

```text
+--------------------------------------------------------------------------+
| SU CO VAN HANH                         [Pham vi: Toan toa nha v]          |
| Chi gom Floor 1 va Floor 2; Floor 3-5 chua co du lieu.                   |
|--------------------------------------------------------------------------|
| [Chua giai quyet]  [Chua tiep nhan]  [Dang xu ly]  [Da giai quyet]       |
|--------------------------------------------------------------------------|
| Muc do | Su co / mo ta       | Tang / Khu vuc | Trang thai | Hanh dong   |
|--------+--------------------+----------------+------------+-------------|
| Cao    | CO2 vuot nguong    | F1 / Phong hop | Chua nhan  | [Tiep nhan] |
| Vua    | AC-03 bao tri      | F1 / Lam viec  | Dang xu ly | [Giai quyet]|
|--------------------------------------------------------------------------|
| Thao tac chi cap nhat du lieu mo phong tren trinh duyet.                 |
+--------------------------------------------------------------------------+
```

**Lưu ý:** nút "Giải quyết" là chức năng đề xuất bổ sung, chưa có trong ứng dụng hiện tại. Không nên thêm nút chỉ để đổi trạng thái nếu chưa có quy tắc xác nhận sự cố đã được khắc phục.

## Wireframe 3: Tổng quan mobile

Trên mobile, hiện sự cố và hành động trước sơ đồ; không thu nhỏ chữ chỉ để giữ nhiều cột. Danh sách sự cố nên dùng từng thẻ ngắn với hành động ngay trong thẻ.

```text
+--------------------------------------+
| [Menu] ICS              [Sự cố]       |
| [Toàn tòa nhà v]                      |
|--------------------------------------|
| TỔNG QUAN VẬN HÀNH                   |
| 2/5 tầng · F1 mô phỏng · F2 mẫu tĩnh |
|--------------------------------------|
| SỰ CỐ CHƯA GIẢI QUYẾT  [Xem tất cả]  |
| +----------------------------------+ |
| | Cao · CO2 vượt ngưỡng            | |
| | Floor 1 · Chưa tiếp nhận         | |
| | [Tiếp nhận]                      | |
| +----------------------------------+ |
| | AC-03 · Đang xử lý               | |
| | Floor 1 · Còn 12 giờ bảo trì     | |
| +----------------------------------+ |
|--------------------------------------|
| CÁC TẦNG                              |
| Floor 1 · Mô phỏng             [>]   |
| Floor 2 · Dữ liệu mẫu tĩnh     [>]   |
| Floor 3–5 · Chưa có dữ liệu          |
|--------------------------------------|
| ĐIỆN NĂNG THEO GIỜ (kWh lũy kế)      |
| Floor 1 · Hôm nay đến HH:mm          |
| [Biểu đồ cuộn theo chiều rộng]        |
+--------------------------------------+
```

## Wireframe 4: Tổng quan Floor 1 trên mobile

Floor 1 đặt KPI, sự cố và thao tác trước bản đồ; Floor 2 vẫn chọn được nhưng dữ liệu của nó không hiển thị như telemetry trực tiếp.

```text
+--------------------------------------+
| [Menu] ICS                            |
| [Floor 1 · Telemetry mô phỏng v]      |
|--------------------------------------|
| TỔNG QUAN VẬN HÀNH FLOOR 1           |
| LIVE/PAUSED · Cập nhật HH:mm          |
|--------------------------------------|
| [Điện hôm nay] [Điện lãng phí ước tính]|
| [Thiết bị]     [Sự cố chưa giải quyết]|
|--------------------------------------|
| SỰ CỐ CHƯA GIẢI QUYẾT                |
| [Thẻ sự cố với trạng thái + hành động]|
|--------------------------------------|
| SƠ ĐỒ FLOOR 1                         |
| [Sơ đồ cuộn ngang · chọn phòng mở drawer]|
|--------------------------------------|
| MÔI TRƯỜNG / TÀI SẢN / NĂNG LƯỢNG     |
| [Bảng có nhãn và chỉ dẫn cuộn ngang]  |
+--------------------------------------+
```

**Quy tắc URL:** chọn một tầng sẽ ghi `?floorId=<id>` để refresh/chia sẻ giữ đúng phạm vi; toàn tòa nhà bỏ tham số này. Liên kết drill-down giữ `floorId`, còn chuyển tầng sẽ xóa bộ lọc phòng/thiết bị/tài sản không còn phù hợp.

## Quy tắc tương tác

- Chỉ hiện CTA khi trang đích hoạt động và mở đúng đối tượng. Nếu 3D chưa sẵn sàng, ghi "Sắp ra mắt" thay vì "Xem trên 3D".
- Menu mobile đóng phải rời khỏi thứ tự Tab. Khi mở drawer phòng, đưa focus vào tiêu đề hoặc nút đóng; khi đóng, đưa focus về phòng vừa chọn.
- Hàng đợi sự cố đứng trước sơ đồ tầng ở desktop lẫn mobile; mobile dùng thẻ có trạng thái và nút thao tác ngay trong thẻ, không cần kéo tới cột cuối.
- Ngôn ngữ gốc của tài liệu là tiếng Việt (`lang="vi"`); nội dung tiếng Anh được đánh dấu riêng nếu cần.
- Trên mobile, hiện độ mới dữ liệu gần chỉ số thay vì ẩn thời điểm cập nhật toàn cục.
- Trạng thái sự cố và trạng thái vận hành thiết bị dùng hệ nhãn/màu riêng: "Đã tiếp nhận" không có nghĩa là "Bình thường".
- Không tạo số 0 thay cho tầng chưa có dữ liệu. Ghi rõ "Chưa có dữ liệu" và đường quay về tầng/tòa nhà có dữ liệu.

## Phạm vi kiểm chứng

Wireframe này mô tả thứ tự và nội dung cuối của desktop/mobile; giao diện triển khai dùng các breakpoint trong `global.css`. Bảng sự cố chuyển thành thẻ trên mobile; các bảng dữ liệu rộng khác giữ cuộn ngang, có nhãn và chỉ dẫn. Trước khi nghiệm thu US06, cần xem trên thiết bị thật và kiểm tra thao tác bàn phím/trình đọc màn hình; Floor 2 vẫn là dữ liệu mẫu tĩnh, không phải telemetry trực tiếp.
