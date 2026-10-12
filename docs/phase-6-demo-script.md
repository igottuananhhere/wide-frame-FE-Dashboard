# Kịch bản demo tòa nhà và các trang Phase 6

**Thời lượng:** khoảng 6–8 phút
**Mục đích:** trình bày tổng quan tòa nhà, trạng thái phạm vi dữ liệu, dự báo năng lượng và các trang drill-down Floor 1.
**Lưu ý:** đây là dữ liệu mock và mô phỏng trong trình duyệt, chưa kết nối cảm biến, IoT hay backend.

## Chuẩn bị

1. Mở terminal tại thư mục dự án và chạy `npm run dev`.
2. Mở URL được Vite in ra, thường là `http://localhost:5173`.
3. Đăng nhập bằng tài khoản phát triển mock: `admin` / `admin123`.
4. Bắt đầu tại `/dashboard/overview`.

## Lời dẫn và thao tác

### 1. Overview tòa nhà — kiểm tra phạm vi tầng

**Nói:** “Đây là tổng quan ICS Headquarters. Demo hiện có dữ liệu mô phỏng cho Floor 1 và Floor 2 trong tổng số 5 tầng.”

**Làm:** xem chỉ số 2/5 tầng có dữ liệu và tổng điện năng 266.6 kWh; chọn Floor 1 để xem sơ đồ riêng, rồi chọn Floor 2 để xem năm khu vực demo và điện năng 141.0 kWh. Nhấn Tổng quan để quay lại phạm vi toàn tòa nhà.

**Kỳ vọng:** Floor 1 và Floor 2 chỉ hiển thị dữ liệu thuộc tầng đã chọn. Floors 3–5 hiển thị Chưa có dữ liệu và không được cộng vào tổng. Nhấn Tổng quan đưa người dùng về tổng hợp toàn tòa nhà.

Chọn KPI năng lượng để mở trang Energy.

### 2. Energy — tiêu thụ điện

**Nói:** “Trang này phân rã mức tiêu thụ theo thời gian, khu vực và các thiết bị có số liệu mẫu riêng.”

**Làm:** xem tổng hôm nay, so sánh hôm qua, biểu đồ theo giờ và thẻ dự báo tiền điện. Bật tự động telemetry ở Overview rồi quay lại Energy để quan sát dữ liệu thay đổi.

**Kỳ vọng:** dữ liệu ngày bắt đầu ở 125.6 kWh, 116.1 kWh hôm qua (+8.2%). Thẻ METER-01 ước tính khoảng 9.517.000 ₫ cho tháng 10, so với 10.125.000 ₫ mock tháng trước; đây là phép chiếu theo đơn giá bình quân demo 2.500 ₫/kWh, chưa phải hóa đơn. Khi mô phỏng chạy, tổng ngày, tỷ lệ so sánh, biểu đồ, mẫu thiết bị và dự báo cùng cập nhật.

### 3. Environment — điều kiện theo khu vực

**Nói:** “Các giá trị được kiểm tra với ngưỡng vận hành, nên khu vực cần chú ý hiện rõ ngay trong bảng.”

**Làm:** mở `/dashboard/environment`; tìm Meeting Room 02.

**Kỳ vọng:** CO₂ của Meeting Room 02 bắt đầu ở 1,100 ppm và được cảnh báo vì vượt ngưỡng 1,000 ppm. Tại Overview, khối Môi trường chỉ đếm ngoại lệ môi trường; sơ đồ đếm riêng ngoại lệ vận hành. Hai số này có thể khác nhau và từng phòng đều có tên cùng nguyên nhân cụ thể. Chọn **Meeting Room 02 CO₂ High** trong bảng mô phỏng để đẩy giá trị lên 1,600 ppm, trạng thái Critical và cập nhật sự cố; Return System To Normal đưa giá trị về 800 ppm.

### 4. Devices — tình trạng kết nối

**Nói:** “Danh sách hiển thị những thiết bị được mô hình hóa riêng. Các con số thiết bị còn lại được tổng hợp ở cấp khu vực.”

**Làm:** mở `/dashboard/devices`, chọn Offline rồi chọn All. Để xem trạng thái Warning, quay lại Overview, chọn scenario **AC-03 Maintenance Due**, nhấn **SIMULATE EVENT**, rồi mở lại Devices và chọn Warning.

**Kỳ vọng:** Floor 1 có 26 thiết bị theo tổng phòng: 5 thiết bị có hồ sơ riêng và 21 thiết bị tổng hợp. Bộ lọc áp dụng cho 5 thiết bị riêng; Online/Offline tổng hợp trên thẻ lấy từ số liệu phòng. Bộ lọc Offline hiển thị WS-08 và UT-01. Sau scenario bảo trì, Warning hiển thị AC-03. Thiết bị đang Warning không được tính vào bộ lọc Online.

### 5. Incidents — tiếp nhận một sự cố

**Nói:** “Sự cố có trạng thái để theo dõi việc tiếp nhận. Trong POC, thao tác này chỉ đổi trạng thái local.”

**Làm:** đăng nhập Admin, mở `/dashboard/incidents`; chọn **Tiếp nhận** ở một sự cố **Chưa tiếp nhận**. Xác nhận sự cố vẫn nằm trong **Chưa giải quyết** với trạng thái **Đang xử lý**, rồi chọn bộ lọc **Đang xử lý**. Đăng nhập Viewer để xem trang ở chế độ chỉ đọc.

**Kỳ vọng:** sự cố đã tiếp nhận vẫn được tính là chưa giải quyết; Viewer chỉ thấy ghi chú “Admin xử lý”. Sự cố được đánh dấu **Đã giải quyết** khi mô phỏng khôi phục điều kiện. Đây chưa phải thao tác gửi tới hệ thống vận hành thật.

### 6. Assets — hồ sơ Digital Identity

**Nói:** “Hồ sơ tài sản nối danh tính, vị trí và trạng thái bảo trì với thiết bị trong Twin Store.”

**Làm:** mở `/dashboard/assets`; xem hồ sơ AC-03.

**Kỳ vọng:** thấy manufacturer/model, asset ID, phòng, ngày lắp đặt, giờ vận hành và trạng thái bảo trì. AC-03 là hồ sơ mẫu duy nhất hiện có. Khi chạy scenario bảo trì, giờ runtime tiến tới chu kỳ bảo trì và badge đổi sang “Đến hạn bảo trì”; Return System To Normal đưa bộ đếm về trạng thái mock bình thường.

### 7. Drill-down từ sơ đồ phòng

**Nói:** “Người dùng có thể đi từ tầng xuống phòng rồi tới danh sách thiết bị trong đúng phòng đó.”

**Làm:** quay lại Overview, chọn Server Room trên sơ đồ, nhấn Xem chi tiết. Trong trang Thiết bị, nhấn Xóa lọc khu vực.

**Kỳ vọng:** ban đầu chỉ còn thiết bị mẫu của Server Room; xóa lọc sẽ hiện lại danh sách Floor 1.

### 8. Tùy chọn — chạy mô phỏng sự kiện

**Nói:** “Các cảnh báo có thể được kiểm tra bằng mô phỏng, không phải tín hiệu thiết bị thật.”

**Làm:** ở Overview, trong Realtime simulation chọn **Server Room Temperature High**, nhấn **SIMULATE EVENT**. Mở sơ đồ, hàng đợi cảnh báo, trang Môi trường hoặc xem chi tiết Server Room. Bật Auto telemetry rồi chuyển qua các route chi tiết để xác nhận timer vẫn chạy. Sau đó thử TEMP-04 Offline, AC-03 Maintenance Due và Meeting Room 02 CO₂ High. Kết thúc bằng **Return System To Normal** hoặc **Reset Simulation**.

**Kỳ vọng:** nhiệt độ Server Room tăng theo chuỗi telemetry và giữ ở 29.1°C / Critical; sơ đồ, drawer, KPI, hàng đợi cảnh báo, cảm biến và timestamp cùng cập nhật. Dữ liệu điện cũng thay đổi trong lúc Auto telemetry chạy. Return System To Normal khôi phục các số liệu mock về trạng thái bình thường, đánh dấu cảnh báo đang hoạt động là Resolved và dừng telemetry; Reset khôi phục hoàn toàn seed ban đầu.

**Chốt:** “Năm trang drill-down của Floor 1 đã hoạt động. Tích hợp API/IoT, phân quyền backend và mô hình 3D vẫn thuộc phạm vi phase sau.”
