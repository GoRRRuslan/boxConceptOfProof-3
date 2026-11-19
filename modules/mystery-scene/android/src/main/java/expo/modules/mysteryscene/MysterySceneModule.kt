package expo.modules.mysteryscene

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class CardLookRecord : Record {
  /** Linear RGB of the box body. */
  @Field
  val color: List<Double> = listOf(1.0, 1.0, 1.0)

  @Field
  val roughness: Double = 0.5

  @Field
  val metallic: Double = 0.0

  @Field
  val clearCoat: Double = 0.0
}

/**
 * JavaScript API of the native scene. The view takes the cards; everything that changes at frame rate (scroll offset, finger,
 * opening) is a synchronous native call that only writes into the SceneController: no view update, no main thread hop.
 * The render loop reads the state itself.
 */
class MysterySceneModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MysteryScene")

    Function("setScrollOffset") { offset: Double -> SceneHost.command { c, now -> c.setScrollOffset(offset, now) } }
    Function("pressIn") { cardIndex: Int -> SceneHost.command { c, now -> c.pressIn(cardIndex, now) } }
    Function("pressOut") { SceneHost.command { c, now -> c.pressOut(now) } }
    Function("focus") { cardIndex: Int -> SceneHost.command { c, now -> c.focus(cardIndex, now) } }
    Function("closeBox") { SceneHost.command { c, now -> c.close(now) } }
    Function("openLid") { SceneHost.command { c, now -> c.openLid(now) } }
    Function("setGlowColor") { red: Double, green: Double, blue: Double ->
      SceneHost.command { c, now -> c.setGlowColor(listOf(red, green, blue), now) }
    }
    Function("tuck") { SceneHost.command { c, now -> c.tuck(now) } }
    Function("dragBy") { deltaX: Double, deltaY: Double -> SceneHost.command { c, now -> c.dragBy(deltaX, deltaY, now) } }
    Function("dragEnd") { velocityX: Double, velocityY: Double -> SceneHost.command { c, now -> c.dragEnd(velocityX, velocityY, now) } }
    Function("pinch") { factor: Double -> SceneHost.command { c, now -> c.pinch(factor, now) } }
    Function("resetView") { SceneHost.command { c, now -> c.resetView(now) } }
    Function("setTilt") { x: Double, y: Double -> SceneHost.command { c, now -> c.setTilt(x, y, now) } }

    View(MysterySceneView::class) {
      Events("onModelLoaded", "onFrameStats", "onSceneError", "onScrollSourceChange")

      Prop("cards") { view: MysterySceneView, cards: List<CardLookRecord> ->
        view.setCards(cards.map { BoxLook(it.color, it.roughness, it.metallic, it.clearCoat) })
      }
      Prop("scrollViewTag") { view: MysterySceneView, tag: Int? -> view.attachScrollView(tag) }
      Prop("isFrameStatsEnabled") { view: MysterySceneView, isEnabled: Boolean -> view.isFrameStatsEnabled = isEnabled }
    }
  }
}
