var NotificationsController = Composer.Controller.extend({
	elements: {
		'a.notifications': 'button',
		'div.notification-list': 'notification_list'
	},

	events: {
		'click a.notifications': 'open_notifications',
		'click a.accept': 'accept',
		'click a.deny': 'deny'
	},

	check_close: null,
	is_open: false,

	init: function()
	{
		var notifications = function()
		{
			this.render();
			turtl.messages.bind(['add', 'remove', 'reset'], function() {
				this.render()
				this.msg_notify();
			}.bind(this), 'header_bar:monitor_messages');
			this.msg_notify();

			this.check_close	=	function(e) {
				if(!e || !e.page) return;
				if(!this.notification_list.hasClass('sel')) return;
				var coords	=	this.notification_list.getCoordinates();
				if((e.page.x < coords.left || e.page.x > coords.right || e.page.y < coords.top || e.page.y > coords.bottom))
				{
					this.open_notifications();	// it SAYS open but it's actually going to close
				}
			}.bind(this);
			document.addEvent('click', this.check_close);
		}.bind(this);

		if(turtl.user.logged_in)
		{
			notifications()
		}
		else
		{
			turtl.user.bind('login', function() {
				turtl.user.unbind('login', 'notifications:init:login');
				notifications();
			}, 'notifications:init:login');
		}
	},

	release: function()
	{
		turtl.messages.unbind(['add', 'remove', 'reset'], 'header_bar:monitor_messages');
		if(this.check_close) $(document).removeEvent('click', this.check_close);
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var notifications	=	turtl.messages.select({notification: true}).map(function(n) {
			return toJSON(n);
		});

		var content	=	Template.render('notifications/index', {
			notifications: notifications,
			is_open: this.is_open,
		});
		this.html(content);
	},

	msg_notify: function()
	{
		var num_unread	=	turtl.messages.select({notification: true}).length;
		if(num_unread > 0)
		{
			var notif	=	this.el.getElement('li a.notifications small');
			if(notif) notif.destroy();
			var notif	=	new Element('small').set('html', num_unread+'');
			var a		=	this.el.getElement('li a.notifications');
			if(!a) return;
			notif.inject(a);
		}
		else
		{
			var notif	=	this.el.getElement('li a.notifications small');
			if(notif) notif.destroy();
		}
	},

	open_notifications: function(e)
	{
		if(e) e.stop();
		if(this.button.hasClass('sel'))
		{
			this.button.removeClass('sel');
			this.notification_list.removeClass('sel');
			this.is_open	=	false;
		}
		else
		{
			this.button.addClass('sel');
			this.notification_list.addClass('sel');
			this.is_open	=	true;
		}
	},

	get_notification_id_from_el: function(el)
	{
		return next_tag_up('li', next_tag_up('li', el).getParent()).className.replace(/^.*notification_([0-9a-f-]+).*?$/, '$1');
	},

	accept: function(e)
	{
		if(!e) return false;
		e.stop();
		var nid		=	this.get_notification_id_from_el(e.target);
		var message	=	turtl.messages.find_by_id(nid);
		if(!message) return;

		var body	=	message.get('body');
		switch(body.type)
		{
		case 'share_board':
			var board_id	=	body.board_id;
			var board_key	=	tcrypt.key_to_bin(body.board_key);
			var persona		=	turtl.user.get('personas').find_by_id(message.get('to'));
			if(!persona) return false;
			// this should never happen, but you never know
			if(!board_id || !board_key) persona.delete_message(message);
			var board	=	new Board({
				id: board_id
			});
			board.key	=	board_key;
			turtl.loading(true);
			board.accept_share(persona, {
				success: function() {
					turtl.loading(false);
					// removeing the message from turtl.messages isn't necessary,
					// but is less visually jarring.
					turtl.messages.remove(message);

					persona.delete_message(message);
					barfr.barf('Invite accepted!');
				}.bind(this),
				error: function(err) {
					turtl.loading(false);
					barfr.barf('There was a problem accepting the invite: '+ err);
				}.bind(this)
			});
			break;
		default:
			return false;
			break;
		}
	},

	deny: function(e)
	{
		if(!e) return false;
		e.stop();
		var nid		=	this.get_notification_id_from_el(e.target);
		var message	=	turtl.messages.find_by_id(nid);
		if(!message) return;

		var body	=	message.get('body');
		switch(body.type)
		{
		case 'share_board':
			var board_id	=	body.board_id;
			var persona		=	turtl.user.get('personas').find_by_id(message.get('to'));
			if(!persona) return false;
			turtl.loading(true);
			persona.delete_message(message, {
				success: function() { turtl.loading(false); },
				error: function() { turtl.loading(false); }
			});
			break;
		default:
			return false;
			break;
		}
	}
});
