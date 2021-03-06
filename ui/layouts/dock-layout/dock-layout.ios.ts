﻿import utils = require("utils/utils");
import view = require("ui/core/view");
import enums = require("ui/enums");
import common = require("./dock-layout-common");
import {CommonLayoutParams, nativeLayoutParamsProperty} from "ui/styling/style";

global.moduleMerge(common, exports);

export class DockLayout extends common.DockLayout {

    protected onDockChanged(view: view.View, oldValue: number, newValue: number) {
        this.requestLayout();
    }

    public onMeasure(widthMeasureSpec: number, heightMeasureSpec: number): void {
        DockLayout.adjustChildrenLayoutParams(this, widthMeasureSpec, heightMeasureSpec);
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);

        var measureWidth = 0;
        var measureHeight = 0;

        var width = utils.layout.getMeasureSpecSize(widthMeasureSpec);
        var widthMode = utils.layout.getMeasureSpecMode(widthMeasureSpec);

        var height = utils.layout.getMeasureSpecSize(heightMeasureSpec);
        var heightMode = utils.layout.getMeasureSpecMode(heightMeasureSpec);

        var density = utils.layout.getDisplayDensity();

        var remainingWidth = widthMode === utils.layout.UNSPECIFIED ? Number.MAX_VALUE : width - ((this.paddingLeft + this.paddingRight) * density);
        var remainingHeight = heightMode === utils.layout.UNSPECIFIED ? Number.MAX_VALUE : height - ((this.paddingTop + this.paddingBottom) * density);

        var tempHeight: number = 0;
        var tempWidth: number = 0;
        var childWidthMeasureSpec: number;
        var childHeightMeasureSpec: number;

        for (let i = 0, count = this.getChildrenCount(); i < count; i++) {
            let child = this.getChildAt(i);
            if (!child._isVisible) {
                continue;
            }

            if (this.stretchLastChild && i === (count - 1)) {
                childWidthMeasureSpec = utils.layout.makeMeasureSpec(remainingWidth, widthMode);
                childHeightMeasureSpec = utils.layout.makeMeasureSpec(remainingHeight, heightMode);
            }
            else {
                // Measure children with AT_MOST even if our mode is EXACT
                childWidthMeasureSpec = utils.layout.makeMeasureSpec(remainingWidth, widthMode === utils.layout.EXACTLY ? utils.layout.AT_MOST : widthMode);
                childHeightMeasureSpec = utils.layout.makeMeasureSpec(remainingHeight, heightMode === utils.layout.EXACTLY ? utils.layout.AT_MOST : heightMode);
            }

            let childSize = view.View.measureChild(this, child, childWidthMeasureSpec, childHeightMeasureSpec);
            let dock = DockLayout.getDock(child);

            switch (dock) {
                case enums.Dock.top:
                case enums.Dock.bottom:
                    remainingHeight = Math.max(0, remainingHeight - childSize.measuredHeight);
                    tempHeight += childSize.measuredHeight;
                    measureWidth = Math.max(measureWidth, tempWidth + childSize.measuredWidth);
                    measureHeight = Math.max(measureHeight, tempHeight);
                    break;

                case enums.Dock.left:
                case enums.Dock.right:
                default:
                    remainingWidth = Math.max(0, remainingWidth - childSize.measuredWidth);
                    tempWidth += childSize.measuredWidth;
                    measureWidth = Math.max(measureWidth, tempWidth);
                    measureHeight = Math.max(measureHeight, tempHeight + childSize.measuredHeight);
                    break;
            }
        }

        measureWidth += (this.paddingLeft + this.paddingRight) * density;
        measureHeight += (this.paddingTop + this.paddingBottom) * density;

        measureWidth = Math.max(measureWidth, this.minWidth * density);
        measureHeight = Math.max(measureHeight, this.minHeight * density);

        var widthAndState = view.View.resolveSizeAndState(measureWidth, width, widthMode, 0);
        var heightAndState = view.View.resolveSizeAndState(measureHeight, height, heightMode, 0);

        this.setMeasuredDimension(widthAndState, heightAndState);
    }

    public onLayout(left: number, top: number, right: number, bottom: number): void {
        super.onLayout(left, top, right, bottom);

        var density = utils.layout.getDisplayDensity();

        var childLeft = this.paddingLeft * density;
        var childTop = this.paddingTop * density;

        var x = childLeft;
        var y = childTop;

        var remainingWidth = Math.max(0, right - left - ((this.paddingLeft + this.paddingRight) * density));
        var remainingHeight = Math.max(0, bottom - top - ((this.paddingTop + this.paddingBottom) * density));

        var count = this.getChildrenCount();
        var childToStretch = null;
        if (count > 0 && this.stretchLastChild) {
            count--;
            childToStretch = this.getChildAt(count);
        }

        for (let i = 0; i < count; i++) {
            let child = this.getChildAt(i);
            if (!child._isVisible) {
                continue;
            }

            let lp: CommonLayoutParams = child.style._getValue(nativeLayoutParamsProperty);

            let childWidth = child.getMeasuredWidth() + (lp.leftMargin + lp.rightMargin) * density;
            let childHeight = child.getMeasuredHeight() + (lp.topMargin + lp.bottomMargin) * density;

            let dock = DockLayout.getDock(child);
            switch (dock) {
                case enums.Dock.top:
                    childLeft = x;
                    childTop = y;
                    childWidth = remainingWidth;
                    y += childHeight;
                    remainingHeight = Math.max(0, remainingHeight - childHeight);
                    break;

                case enums.Dock.bottom:
                    childLeft = x;
                    childTop = y + remainingHeight - childHeight;
                    childWidth = remainingWidth;
                    remainingHeight = Math.max(0, remainingHeight - childHeight);
                    break;

                case enums.Dock.right:
                    childLeft = x + remainingWidth - childWidth;
                    childTop = y;
                    childHeight = remainingHeight;
                    remainingWidth = Math.max(0, remainingWidth - childWidth);
                    break;

                case enums.Dock.left:
                default:
                    childLeft = x;
                    childTop = y;
                    childHeight = remainingHeight;
                    x += childWidth;
                    remainingWidth = Math.max(0, remainingWidth - childWidth);
                    break;
            }

            view.View.layoutChild(this, child, childLeft, childTop, childLeft + childWidth, childTop + childHeight);
        }

        if (childToStretch) {
            view.View.layoutChild(this, childToStretch, x, y, x + remainingWidth, y + remainingHeight);
        }

        DockLayout.restoreOriginalParams(this);
    }
}