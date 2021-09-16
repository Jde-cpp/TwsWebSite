import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';

@Component( {selector: 'app-root', templateUrl: './app.component.html', styleUrls: ['./app.component.scss'] })
export class AppComponent
{
	constructor (
		@Inject(DOCUMENT) private document: Document,
		private renderer: Renderer2,
  ) { }

  ngOnInit(){ this.renderer.addClass(this.document.body, 'docs-app-background'); }
  ngOnDestroy(){ this.renderer.removeClass(this.document.body, 'docs-app-background'); }
  title = 'my-workspace';
}
