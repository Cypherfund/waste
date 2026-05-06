#!/bin/bash
git clone https://github.com/flutter/flutter.git -b stable --depth 1
./flutter/bin/flutter config --enable-web
./flutter/bin/flutter pub get
./flutter/bin/flutter build web --release --dart-define=API_BASE_URL=https://waste-0faw.onrender.com/api/v1 --dart-define=WS_BASE_URL=wss://waste-0faw.onrender.com
