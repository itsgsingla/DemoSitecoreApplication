using Demo.Foundation.ORM.Models;
using Glass.Mapper.Sc.Configuration.Attributes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Demo.Feature.NewsListing.Models
{
	[SitecoreType(TemplateId = TemplateIdConstants.NewsCategoryConstants.TemplateId)]
	public interface INewsCategory : IGlassBase
	{
		[SitecoreField(FieldId = TemplateIdConstants.NewsCategoryConstants.ValueId)]
		string Value { get; set; }
	}
}