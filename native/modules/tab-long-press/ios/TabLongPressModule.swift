import ExpoModulesCore
import UIKit

/// Adds a press-and-hold recognizer to the app's tab bar and sends the pressed tab's
/// position (0 = leftmost visible tab) to JavaScript as `onTabLongPress`.
public class TabLongPressModule: Module {
  private var recognizer: UILongPressGestureRecognizer?
  private weak var tabBar: UITabBar?
  private let helper = Helper()

  public func definition() -> ModuleDefinition {
    Name("TabLongPress")
    Events("onTabLongPress")

    /// Finds the tab bar (retrying while the tabs are still being created) and attaches once.
    Function("attach") {
      DispatchQueue.main.async { self.attach(attempt: 0) }
    }

    OnDestroy {
      DispatchQueue.main.async { self.detach() }
    }
  }

  private func attach(attempt: Int) {
    if let bar = findTabBar() {
      if bar === tabBar, recognizer != nil { return }
      detach()
      let press = UILongPressGestureRecognizer(target: helper, action: #selector(Helper.handle(_:)))
      press.minimumPressDuration = 0.45
      press.cancelsTouchesInView = true
      press.delegate = helper
      helper.onBegan = { [weak self] point in self?.report(point) }
      bar.addGestureRecognizer(press)
      recognizer = press
      tabBar = bar
      return
    }
    if attempt < 20 {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self.attach(attempt: attempt + 1) }
    }
  }

  private func detach() {
    if let press = recognizer { press.view?.removeGestureRecognizer(press) }
    recognizer = nil
    tabBar = nil
  }

  private func report(_ point: CGPoint) {
    guard let bar = tabBar else { return }
    let frames = buttonFrames(in: bar)
    var index = -1
    if !frames.isEmpty {
      // The button under the finger, else the nearest one along the bar.
      if let hit = frames.firstIndex(where: { $0.insetBy(dx: -4, dy: -12).contains(point) }) {
        index = hit
      } else {
        index = frames.enumerated().min(by: { abs($0.element.midX - point.x) < abs($1.element.midX - point.x) })?.offset ?? -1
      }
    } else {
      let count = max(bar.items?.count ?? 0, 1)
      index = min(count - 1, max(0, Int(point.x / max(bar.bounds.width, 1) * CGFloat(count))))
    }
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    sendEvent("onTabLongPress", ["index": index, "count": frames.count])
  }

  /// Frames of the visible tab buttons in the bar's coordinates, left to right.
  private func buttonFrames(in bar: UITabBar) -> [CGRect] {
    var found: [CGRect] = []
    func walk(_ view: UIView) {
      for child in view.subviews where !child.isHidden && child.alpha > 0.01 {
        let name = String(describing: type(of: child))
        if name.contains("TabBarButton") || name.contains("TabButton") {
          let frame = child.convert(child.bounds, to: bar)
          if frame.width > 8, frame.width < bar.bounds.width * 0.7 { found.append(frame) }
          continue
        }
        walk(child)
      }
    }
    walk(bar)
    // Some iOS versions draw each button twice (a plain copy and a selected copy); keep one per spot.
    var unique: [CGRect] = []
    for frame in found.sorted(by: { $0.midX < $1.midX }) where !unique.contains(where: { abs($0.midX - frame.midX) < 6 }) {
      unique.append(frame)
    }
    return unique
  }

  private func findTabBar() -> UITabBar? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    for window in windows {
      if let root = window.rootViewController, let bar = findTabBar(in: root) { return bar }
    }
    return nil
  }

  private func findTabBar(in controller: UIViewController) -> UITabBar? {
    if let tabs = controller as? UITabBarController, tabs.viewIfLoaded?.window != nil { return tabs.tabBar }
    for child in controller.children {
      if let bar = findTabBar(in: child) { return bar }
    }
    if let presented = controller.presentedViewController, let bar = findTabBar(in: presented) { return bar }
    return nil
  }
}

private class Helper: NSObject, UIGestureRecognizerDelegate {
  var onBegan: ((CGPoint) -> Void)?

  @objc func handle(_ press: UILongPressGestureRecognizer) {
    guard press.state == .began, let view = press.view else { return }
    onBegan?(press.location(in: view))
  }

  // Leave the tab bar's own gestures (tapping, sliding between tabs) working.
  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
    true
  }
}
