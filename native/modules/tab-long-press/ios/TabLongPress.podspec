Pod::Spec.new do |s|
  s.name           = 'TabLongPress'
  s.version        = '1.0.0'
  s.summary        = 'Reports a press and hold on a tab bar item.'
  s.description    = 'Adds a long-press recognizer to the app tab bar and sends the pressed tab index to JavaScript.'
  s.author         = ''
  s.homepage       = 'https://www.snowd.ca'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift}'
end
