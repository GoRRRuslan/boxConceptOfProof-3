import ExpoModulesCore

struct CardLookRecord: Record {
  // Linear RGB of the box body.
  @Field var color: [Double] = [1, 1, 1]
  @Field var roughness: Double = 0.5
  @Field var metallic: Double = 0
  @Field var clearCoat: Double = 0
}

// JavaScript API of the native scene. The view takes the cards; everything that changes at frame rate (scroll offset,
// finger, opening) is a synchronous native call that only writes into the SceneCore state machine: no view update,
// no Fabric commit, no main thread hop. The render loop reads the state itself.
public class MysterySceneModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MysteryScene")

    Function("setScrollOffset") { (offset: Double) in SceneHost.shared.command { $0.setScrollOffset(offset, now: $1) } }
    Function("pressIn") { (cardIndex: Int) in SceneHost.shared.command { $0.pressIn(cardIndex: cardIndex, now: $1) } }
    Function("pressOut") { SceneHost.shared.command { $0.pressOut(now: $1) } }
    Function("focus") { (cardIndex: Int) in SceneHost.shared.command { $0.focus(cardIndex: cardIndex, now: $1) } }
    Function("closeBox") { SceneHost.shared.command { $0.close(now: $1) } }
    Function("openLid") { SceneHost.shared.command { $0.openLid(now: $1) } }
    Function("setGlowColor") { (red: Double, green: Double, blue: Double, rarityLevel: Double) in
      SceneHost.shared.command { $0.setGlowColor([red, green, blue], rarityLevel: rarityLevel, now: $1) }
    }
    Function("tuck") { SceneHost.shared.command { $0.tuck(now: $1) } }
    Function("dragBy") { (deltaX: Double, deltaY: Double) in
      SceneHost.shared.command { $0.dragBy(deltaX: deltaX, deltaY: deltaY, now: $1) }
    }
    Function("dragEnd") { (velocityX: Double, velocityY: Double) in
      SceneHost.shared.command { $0.dragEnd(velocityX: velocityX, velocityY: velocityY, now: $1) }
    }
    Function("pinch") { (factor: Double) in SceneHost.shared.command { $0.pinch(factor: factor, now: $1) } }
    Function("resetView") { SceneHost.shared.command { $0.resetView(now: $1) } }
    Function("setTilt") { (x: Double, y: Double) in SceneHost.shared.command { $0.setTilt(x: x, y: y, now: $1) } }

    View(MysterySceneView.self) {
      Events("onModelLoaded", "onFrameStats", "onSceneError", "onScrollSourceChange")

      Prop("cards") { (view: MysterySceneView, cards: [CardLookRecord]) in
        view.setCards(
          cards.map { BoxLook(colorLinear: $0.color, roughness: $0.roughness, metallic: $0.metallic, clearCoat: $0.clearCoat) })
      }
      Prop("scrollViewTag") { (view: MysterySceneView, tag: Int?) in view.attachScrollView(tag: tag) }
      Prop("isFrameStatsEnabled") { (view: MysterySceneView, isEnabled: Bool) in view.setFrameStatsEnabled(isEnabled) }
    }
  }
}
