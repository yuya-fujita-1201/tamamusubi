"""check レジストリ。各モジュールは CODE / NAME と run(ctx)->list[Finding] を持つ。

実行順は『構造→接続→反復→視認性(画像)』。orchestrator はこの順に呼ぶ。
"""
from . import height_connection
from . import stairs
from . import waterfall
from . import bridge
from . import shrine
from . import river
from . import repetition
from . import walkable
from . import contact
from . import density
from . import grid_seam
from . import noise

ALL_CHECKS = [
    height_connection,
    stairs,
    waterfall,
    bridge,
    shrine,
    river,
    repetition,
    walkable,
    contact,
    density,
    grid_seam,
    noise,
]
